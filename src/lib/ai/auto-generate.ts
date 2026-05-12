import { createServiceClient } from '@/lib/supabase/server'
import { getAiAddonStatus, consumeCredits, getAnthropicApiKey, totalAvailableCredits } from './entitlements'
import { generate } from './generate'
import type { GenerationContext } from './prompts'
import { type GenerationType, ALL_GENERATION_TYPES, CREDIT_COSTS } from './constants'

export async function runAutoGeneration(params: {
  orgId: string
  episodeId: string
  transcriptionId: string
  pipelineJobId: string
}): Promise<void> {
  const supabase = createServiceClient()

  const { data: transcription } = await supabase
    .from('transcriptions')
    .select('full_text')
    .eq('id', params.transcriptionId)
    .single()

  if (!transcription?.full_text) {
    await supabase
      .from('ai_pipeline_jobs')
      .update({ status: 'failed', error_message: 'No transcript text available' })
      .eq('id', params.pipelineJobId)
    return
  }

  const { data: episodeRow } = await supabase
    .from('episodes')
    .select('id, title, episode_number, description, notes, show_id, shows(id, name, description, format, ai_auto_generate, ai_tone, ai_length, episode_template)')
    .eq('id', params.episodeId)
    .single()

  if (!episodeRow) {
    await supabase
      .from('ai_pipeline_jobs')
      .update({ status: 'failed', error_message: 'Episode not found' })
      .eq('id', params.pipelineJobId)
    return
  }

  const show = episodeRow.shows as unknown as {
    id: string; name: string; description: string; format: string; ai_auto_generate: string[] | null;
    ai_tone: string | null; ai_length: string | null; episode_template: string | null
  }

  const enabledTypes = (show.ai_auto_generate?.length ? show.ai_auto_generate : ALL_GENERATION_TYPES)
    .filter((t): t is GenerationType => ALL_GENERATION_TYPES.includes(t as GenerationType))

  if (enabledTypes.length === 0) {
    await supabase
      .from('ai_pipeline_jobs')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', params.pipelineJobId)
    return
  }

  await supabase
    .from('ai_pipeline_jobs')
    .update({ status: 'generating' })
    .eq('id', params.pipelineJobId)

  const [addon, { data: recentEpisodes }] = await Promise.all([
    getAiAddonStatus(params.orgId),
    supabase
      .from('episodes')
      .select('title')
      .eq('show_id', episodeRow.show_id)
      .neq('id', params.episodeId)
      .order('created_at', { ascending: false })
      .limit(5),
  ])
  const apiKey = getAnthropicApiKey(addon)

  const ctx: GenerationContext = {
    transcript: transcription.full_text,
    showName: show.name,
    showDescription: show.description || undefined,
    episodeTitle: episodeRow.title,
    episodeNumber: episodeRow.episode_number || undefined,
    format: show.format || undefined,
    existingNotes: episodeRow.notes || undefined,
    previousTitles: recentEpisodes?.map(e => e.title) || [],
    showNotesTemplate: show.episode_template || undefined,
    tone: (show.ai_tone as GenerationContext['tone']) || undefined,
    length: (show.ai_length as GenerationContext['length']) || undefined,
  }

  const generationIds: string[] = []
  const skippedTypes: string[] = []
  let remainingCredits = totalAvailableCredits(addon)
  const episodeUpdates: Record<string, string> = {}

  for (const type of enabledTypes) {
    const cost = CREDIT_COSTS[type]

    if (!addon.selfHosted && remainingCredits < cost) {
      skippedTypes.push(type)
      continue
    }

    try {
      const { result, inputTokens, outputTokens } = await generate(type, ctx, apiKey)

      const { data: generation } = await supabase
        .from('ai_generations')
        .insert({
          org_id: params.orgId,
          episode_id: params.episodeId,
          transcription_id: params.transcriptionId,
          generation_type: type,
          result,
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          credits_consumed: cost,
        })
        .select('id')
        .single()

      await consumeCredits(params.orgId, cost, type, generation?.id || params.episodeId)
      remainingCredits -= cost

      if (generation) generationIds.push(generation.id)

      if (type === 'show_notes') episodeUpdates.notes = result
      if (type === 'description') episodeUpdates.description = result
    } catch {
      skippedTypes.push(type)
    }
  }

  if (Object.keys(episodeUpdates).length > 0) {
    await supabase
      .from('episodes')
      .update(episodeUpdates)
      .eq('id', params.episodeId)
  }

  const finalStatus = skippedTypes.length > 0 && generationIds.length > 0
    ? 'partial'
    : skippedTypes.length === enabledTypes.length
      ? 'failed'
      : 'completed'

  await supabase
    .from('ai_pipeline_jobs')
    .update({
      status: finalStatus,
      generation_ids: generationIds,
      completed_at: new Date().toISOString(),
      error_message: skippedTypes.length > 0
        ? `Skipped: ${skippedTypes.join(', ')} (insufficient credits)`
        : null,
    })
    .eq('id', params.pipelineJobId)

  const typesGenerated = generationIds.length
  await supabase.from('activity_log').insert({
    show_id: show.id,
    episode_id: params.episodeId,
    action: 'ai_generation_completed',
    description: `AI generated ${typesGenerated} content type${typesGenerated !== 1 ? 's' : ''} for ${episodeRow.title}`,
    metadata: {
      pipeline_job_id: params.pipelineJobId,
      types_generated: enabledTypes.filter(t => !skippedTypes.includes(t)),
      types_skipped: skippedTypes,
    },
  })
}

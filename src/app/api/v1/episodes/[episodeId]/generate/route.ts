import { NextRequest } from 'next/server'
import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'
import { createServiceClient } from '@/lib/supabase/server'
import { getAiAddonStatus, consumeCredits, getAnthropicApiKey, totalAvailableCredits } from '@/lib/ai/entitlements'
import { generate } from '@/lib/ai/generate'
import type { GenerationContext } from '@/lib/ai/prompts'
import { type GenerationType, ALL_GENERATION_TYPES, CREDIT_COSTS } from '@/lib/ai/constants'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ episodeId: string }> }
) {
  const { episodeId } = await params
  const { supabase, org, error } = await getAuthenticatedClient()
  if (error) return error

  const { data: episode } = await supabase!
    .from('episodes')
    .select('id, title, episode_number, description, notes, show_id, shows(id, name, description, format, client_id, clients(org_id))')
    .eq('id', episodeId)
    .single()

  if (!episode) return errorResponse('Episode not found', 404)

  const show = episode.shows as unknown as { name: string; description: string; format: string; clients: { org_id: string } | null } | null
  if (!show?.clients || show.clients.org_id !== org!.id) return errorResponse('Forbidden', 403)

  const addon = await getAiAddonStatus(org!.id)
  if (!addon.enabled) {
    return errorResponse('AI is not available on your current plan. Upgrade to Pro or Studio.', 403)
  }

  const body = await request.json()
  const { type, apply } = body as { type: GenerationType; apply?: boolean }

  if (!ALL_GENERATION_TYPES.includes(type)) {
    return errorResponse(`Invalid generation type. Must be one of: ${ALL_GENERATION_TYPES.join(', ')}`)
  }

  const service = createServiceClient()

  const { data: transcription } = await service
    .from('transcriptions')
    .select('id, full_text')
    .eq('episode_id', episodeId)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!transcription?.full_text) {
    return errorResponse('No completed transcription found. Transcribe the episode first.')
  }

  const creditCost = CREDIT_COSTS[type]
  const available = totalAvailableCredits(addon)
  if (!addon.selfHosted && available < creditCost) {
    return errorResponse(`Insufficient credits. Need ${creditCost}, have ${available}.`, 403)
  }

  const ctx: GenerationContext = {
    transcript: transcription.full_text,
    showName: show.name,
    showDescription: show.description || undefined,
    episodeTitle: episode.title,
    episodeNumber: episode.episode_number || undefined,
    format: show.format || undefined,
    existingNotes: episode.notes || undefined,
  }

  const apiKey = getAnthropicApiKey(addon)
  const { result, inputTokens, outputTokens } = await generate(type, ctx, apiKey)

  const { data: generation } = await service
    .from('ai_generations')
    .insert({
      org_id: org!.id,
      episode_id: episodeId,
      transcription_id: transcription.id,
      generation_type: type,
      result,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      credits_consumed: creditCost,
    })
    .select()
    .single()

  await consumeCredits(org!.id, creditCost, type, generation?.id || episodeId)

  if (apply && generation) {
    const updateField = type === 'show_notes' ? 'notes' : type === 'description' ? 'description' : null
    if (updateField) {
      await service
        .from('episodes')
        .update({ [updateField]: result })
        .eq('id', episodeId)
    }
  }

  return jsonResponse({
    generation: {
      id: generation?.id,
      type,
      result,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      credits_consumed: creditCost,
      applied: apply && (type === 'show_notes' || type === 'description'),
    },
  })
}

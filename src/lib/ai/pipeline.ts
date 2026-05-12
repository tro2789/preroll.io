import { createServiceClient } from '@/lib/supabase/server'
import { getAiAddonStatus, totalAvailableCredits, consumeCredits, refundCredits, getDeepgramApiKey } from './entitlements'
import { submitTranscription, buildCallbackUrl } from './deepgram'
import { MAX_CONCURRENT_TRANSCRIPTIONS } from './constants'

type PipelineResult = { jobId: string; status: string; skippedReason?: string }

interface PipelineParams {
  orgId: string
  episodeId: string
  fileReferenceId: string
  audioUrl: string
  durationSeconds?: number
  triggerSource: 'auto_upload' | 'auto_webhook' | 'manual'
}

async function insertPipelineJob(
  supabase: ReturnType<typeof createServiceClient>,
  params: PipelineParams,
  status: string,
  extra?: { skipped_reason?: string; transcription_id?: string }
): Promise<string> {
  const { data: job } = await supabase
    .from('ai_pipeline_jobs')
    .insert({
      org_id: params.orgId,
      episode_id: params.episodeId,
      file_reference_id: params.fileReferenceId,
      trigger_source: params.triggerSource,
      status,
      ...extra,
    })
    .select('id')
    .single()
  return job?.id || ''
}

export async function triggerAiPipeline(params: PipelineParams): Promise<PipelineResult> {
  const supabase = createServiceClient()

  const [addon, { data: episode }] = await Promise.all([
    getAiAddonStatus(params.orgId),
    supabase
      .from('episodes')
      .select('show_id, shows(ai_auto_transcribe)')
      .eq('id', params.episodeId)
      .single(),
  ])

  if (!addon.enabled) {
    const jobId = await insertPipelineJob(supabase, params, 'skipped', { skipped_reason: 'disabled' })
    return { jobId, status: 'skipped', skippedReason: 'disabled' }
  }

  if (!episode) {
    return { jobId: '', status: 'skipped', skippedReason: 'episode_not_found' }
  }

  const show = episode.shows as unknown as { ai_auto_transcribe: boolean } | null

  if (show && !show.ai_auto_transcribe && params.triggerSource !== 'manual') {
    const jobId = await insertPipelineJob(supabase, params, 'skipped', { skipped_reason: 'disabled' })
    return { jobId, status: 'skipped', skippedReason: 'disabled' }
  }

  const estimatedMinutes = Math.ceil((params.durationSeconds || 3600) / 60)
  const available = totalAvailableCredits(addon)

  if (!addon.selfHosted && available < estimatedMinutes) {
    const jobId = await insertPipelineJob(supabase, params, 'skipped', { skipped_reason: 'no_credits' })
    return { jobId, status: 'skipped', skippedReason: 'no_credits' }
  }

  const { count } = await supabase
    .from('transcriptions')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', params.orgId)
    .in('status', ['pending', 'processing'])

  if ((count ?? 0) >= MAX_CONCURRENT_TRANSCRIPTIONS) {
    const jobId = await insertPipelineJob(supabase, params, 'pending')
    return { jobId, status: 'pending' }
  }

  const { data: existingTranscription } = await supabase
    .from('transcriptions')
    .select('id')
    .eq('episode_id', params.episodeId)
    .in('status', ['pending', 'processing'])
    .limit(1)
    .maybeSingle()

  if (existingTranscription) {
    const jobId = await insertPipelineJob(supabase, params, 'skipped', { skipped_reason: 'already_transcribing' })
    return { jobId, status: 'skipped', skippedReason: 'already_transcribing' }
  }

  const { data: transcription } = await supabase
    .from('transcriptions')
    .insert({
      org_id: params.orgId,
      episode_id: params.episodeId,
      source_type: 'file_reference',
      source_ref: params.fileReferenceId,
      audio_duration_seconds: params.durationSeconds || null,
      credits_consumed: estimatedMinutes,
    })
    .select()
    .single()

  if (!transcription) {
    return { jobId: '', status: 'failed' }
  }

  const { success } = await consumeCredits(
    params.orgId,
    estimatedMinutes,
    'transcription',
    transcription.id
  )

  if (!success) {
    await supabase.from('transcriptions').delete().eq('id', transcription.id)
    const jobId = await insertPipelineJob(supabase, params, 'skipped', { skipped_reason: 'no_credits' })
    return { jobId, status: 'skipped', skippedReason: 'no_credits' }
  }

  const jobId = await insertPipelineJob(supabase, params, 'transcribing', {
    transcription_id: transcription.id,
  })

  try {
    const callbackUrl = buildCallbackUrl(transcription.id)
    const apiKey = getDeepgramApiKey(addon)
    const { requestId } = await submitTranscription(params.audioUrl, callbackUrl, apiKey)

    await supabase
      .from('transcriptions')
      .update({ external_request_id: requestId })
      .eq('id', transcription.id)
  } catch (err) {
    await supabase
      .from('transcriptions')
      .update({ status: 'failed', error_message: (err as Error).message })
      .eq('id', transcription.id)

    await refundCredits(params.orgId, estimatedMinutes, 'transcription_failed', transcription.id)

    await supabase
      .from('ai_pipeline_jobs')
      .update({ status: 'failed', error_message: (err as Error).message })
      .eq('id', jobId)

    return { jobId, status: 'failed' }
  }

  await supabase.from('activity_log').insert({
    show_id: episode.show_id,
    episode_id: params.episodeId,
    action: 'ai_pipeline_started',
    description: 'AI pipeline started: auto-transcribing audio',
    metadata: { pipeline_job_id: jobId, trigger_source: params.triggerSource },
  })

  return { jobId, status: 'transcribing' }
}

export function isAudioMimeType(mimeType: string | null | undefined): boolean {
  if (!mimeType) return false
  return mimeType.startsWith('audio/') || mimeType.startsWith('video/')
}

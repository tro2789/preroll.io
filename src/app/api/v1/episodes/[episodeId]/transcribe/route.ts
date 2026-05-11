import { NextRequest } from 'next/server'
import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'
import { createServiceClient } from '@/lib/supabase/server'
import { getAiAddonStatus, consumeCredits, refundCredits, getDeepgramApiKey, totalAvailableCredits } from '@/lib/ai/entitlements'
import { submitTranscription, buildCallbackUrl } from '@/lib/ai/deepgram'
import { MAX_CONCURRENT_TRANSCRIPTIONS } from '@/lib/ai/constants'

const MAX_DURATION_SECONDS = 180 * 60

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ episodeId: string }> }
) {
  const { episodeId } = await params
  const { supabase, org, error } = await getAuthenticatedClient()
  if (error) return error

  const { data: episode } = await supabase!
    .from('episodes')
    .select('id, title, show_id, shows(id, client_id, clients(org_id))')
    .eq('id', episodeId)
    .single()

  if (!episode) return errorResponse('Episode not found', 404)

  const show = episode.shows as unknown as { clients: { org_id: string } | null } | null
  if (!show?.clients || show.clients.org_id !== org!.id) return errorResponse('Forbidden', 403)

  const addon = await getAiAddonStatus(org!.id)
  if (!addon.enabled) {
    return errorResponse('AI is not available on your current plan. Upgrade to Pro or Studio.', 403)
  }

  const body = await request.json()
  const { source_type, source_ref, audio_url, duration_seconds } = body as {
    source_type: 'file_reference' | 'r2' | 'url'
    source_ref: string
    audio_url: string
    duration_seconds?: number
  }

  if (!source_type || !source_ref || !audio_url) {
    return errorResponse('source_type, source_ref, and audio_url are required')
  }

  if (duration_seconds && duration_seconds > MAX_DURATION_SECONDS) {
    return errorResponse(`Audio exceeds maximum duration of ${MAX_DURATION_SECONDS / 60} minutes`)
  }

  const service = createServiceClient()

  const { count } = await service
    .from('transcriptions')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', org!.id)
    .in('status', ['pending', 'processing'])

  if ((count ?? 0) >= MAX_CONCURRENT_TRANSCRIPTIONS) {
    return errorResponse(`Maximum ${MAX_CONCURRENT_TRANSCRIPTIONS} concurrent transcriptions. Wait for existing jobs to complete.`)
  }

  const estimatedMinutes = Math.ceil((duration_seconds || 3600) / 60)

  const available = totalAvailableCredits(addon)
  if (!addon.selfHosted && available < estimatedMinutes) {
    return errorResponse(`Insufficient credits. Need ~${estimatedMinutes}, have ${available}. Purchase more in Settings → AI.`, 403)
  }

  const { data: transcription, error: insertError } = await service
    .from('transcriptions')
    .insert({
      org_id: org!.id,
      episode_id: episodeId,
      source_type,
      source_ref,
      audio_duration_seconds: duration_seconds || null,
      credits_consumed: estimatedMinutes,
    })
    .select()
    .single()

  if (insertError || !transcription) {
    return errorResponse('Failed to create transcription record', 500)
  }

  const { success } = await consumeCredits(
    org!.id,
    estimatedMinutes,
    'transcription',
    transcription.id
  )

  if (!success) {
    await service.from('transcriptions').delete().eq('id', transcription.id)
    return errorResponse('Insufficient credits', 403)
  }

  try {
    const callbackUrl = buildCallbackUrl(transcription.id)
    const apiKey = getDeepgramApiKey(addon)
    const { requestId } = await submitTranscription(audio_url, callbackUrl, apiKey)

    await service
      .from('transcriptions')
      .update({ external_request_id: requestId })
      .eq('id', transcription.id)

    return jsonResponse({ ...transcription, external_request_id: requestId }, 201)
  } catch (err) {
    await service
      .from('transcriptions')
      .update({ status: 'failed', error_message: (err as Error).message })
      .eq('id', transcription.id)

    await refundCredits(org!.id, estimatedMinutes, 'transcription_failed', transcription.id)

    return errorResponse(`Transcription submission failed: ${(err as Error).message}`, 500)
  }
}

import { NextRequest } from 'next/server'
import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'
import { triggerAiPipeline } from '@/lib/ai/pipeline'
import { getValidToken, getIntegrationAccountId } from '@/lib/integrations/token-refresh'
import { ensureProvidersRegistered } from '@/lib/integrations/init'
import { getProvider } from '@/lib/integrations/registry'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ episodeId: string }> }
) {
  const { episodeId } = await params
  const { supabase, org, error } = await getAuthenticatedClient()
  if (error) return error

  const { data: episode } = await supabase!
    .from('episodes')
    .select('id, shows(id, client_id, clients(org_id))')
    .eq('id', episodeId)
    .single()

  if (!episode) return errorResponse('Episode not found', 404)

  const show = episode.shows as unknown as { clients: { org_id: string } | null } | null
  if (!show?.clients || show.clients.org_id !== org!.id) return errorResponse('Forbidden', 403)

  const [{ data: jobs }, { data: generations }] = await Promise.all([
    supabase!
      .from('ai_pipeline_jobs')
      .select('*')
      .eq('episode_id', episodeId)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase!
      .from('ai_generations')
      .select('id, generation_type, result, credits_consumed, created_at')
      .eq('episode_id', episodeId)
      .order('created_at', { ascending: false }),
  ])

  return jsonResponse({
    pipeline: jobs?.[0] || null,
    jobs: jobs || [],
    generations: generations || [],
  })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ episodeId: string }> }
) {
  const { episodeId } = await params
  const { supabase, org, error } = await getAuthenticatedClient()
  if (error) return error

  const { data: episode } = await supabase!
    .from('episodes')
    .select('id, shows(id, client_id, clients(org_id))')
    .eq('id', episodeId)
    .single()

  if (!episode) return errorResponse('Episode not found', 404)

  const show = episode.shows as unknown as { clients: { org_id: string } | null } | null
  if (!show?.clients || show.clients.org_id !== org!.id) return errorResponse('Forbidden', 403)

  const body = await request.json().catch(() => ({}))
  let audioUrl = body.audio_url as string | undefined
  let fileReferenceId = body.file_reference_id as string | undefined
  let durationSeconds = body.duration_seconds as number | undefined

  if (!audioUrl) {
    const { data: integration } = await supabase!
      .from('episode_integrations')
      .select('provider')
      .eq('episode_id', episodeId)
      .maybeSingle()

    if (!integration) return errorResponse('No delivery provider connected', 400)

    ensureProvidersRegistered()
    const provider = getProvider(integration.provider)
    const token = await getValidToken(org!.id, integration.provider)
    const accountId = await getIntegrationAccountId(org!.id, integration.provider)

    const { data: refs } = await supabase!
      .from('file_references')
      .select('id, external_id, mime_type, duration_seconds')
      .eq('episode_id', episodeId)
      .order('created_at', { ascending: false })

    const audioRef = refs?.find(r =>
      r.mime_type?.startsWith('audio/') || r.mime_type?.startsWith('video/')
    )

    if (!audioRef) {
      if (!provider.listFolderContents) return errorResponse('No audio files found on this episode', 400)

      const { data: epIntegration } = await supabase!
        .from('episode_integrations')
        .select('external_folder_id')
        .eq('episode_id', episodeId)
        .single()

      if (!epIntegration?.external_folder_id) return errorResponse('No folder linked', 400)

      const listing = await provider.listFolderContents(token, accountId, epIntegration.external_folder_id)
      const audioFile = listing.items.find(f =>
        f.mimeType?.startsWith('audio/') || f.mimeType?.startsWith('video/')
      )

      if (!audioFile) return errorResponse('No audio or video files found in the delivery folder', 400)

      const details = await provider.getFileDetails(token, accountId, audioFile.id)

      if (integration.provider === 'frame_io') {
        const frameRes = await fetch(
          `https://api.frame.io/v4/accounts/${accountId}/files/${audioFile.id}?include=media_links.original`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        if (!frameRes.ok) return errorResponse('Failed to get file download URL from Frame.io', 502)
        const frameData = await frameRes.json()
        const fileData = frameData.data || frameData
        audioUrl = fileData.media_links?.original?.url || fileData.original
        if (!audioUrl) return errorResponse('No download URL available for this file', 502)
      } else {
        audioUrl = details.viewUrl
        if (!audioUrl) return errorResponse('No URL available for this file', 400)
      }

      fileReferenceId = audioFile.id
      durationSeconds = audioFile.durationSeconds
    } else {
      fileReferenceId = audioRef.id
      durationSeconds = audioRef.duration_seconds ?? undefined

      if (integration.provider === 'frame_io') {
        const frameRes = await fetch(
          `https://api.frame.io/v4/accounts/${accountId}/files/${audioRef.external_id}?include=media_links.original`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        if (!frameRes.ok) return errorResponse('Failed to get file download URL from Frame.io', 502)
        const frameData = await frameRes.json()
        const fileData = frameData.data || frameData
        audioUrl = fileData.media_links?.original?.url || fileData.original
        if (!audioUrl) return errorResponse('No download URL available for this file', 502)
      } else {
        const details = await provider.getFileDetails(token, accountId, audioRef.external_id)
        audioUrl = details.viewUrl
        if (!audioUrl) return errorResponse('No URL available for this file', 400)
      }
    }
  }

  const result = await triggerAiPipeline({
    orgId: org!.id,
    episodeId,
    fileReferenceId: fileReferenceId || '',
    audioUrl,
    durationSeconds,
    triggerSource: 'manual',
  })

  return jsonResponse(result, 201)
}

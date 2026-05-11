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
      .select('provider, external_folder_id')
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

    let externalId: string | null = null

    const audioRef = refs?.find(r =>
      r.mime_type?.startsWith('audio/') || r.mime_type?.startsWith('video/')
    )

    if (audioRef) {
      fileReferenceId = audioRef.id
      durationSeconds = audioRef.duration_seconds ?? undefined
      externalId = audioRef.external_id
    } else if (provider.listFolderContents && integration.external_folder_id) {
      const listing = await provider.listFolderContents(token, accountId, integration.external_folder_id)
      const audioFile = listing.items.find(f =>
        f.mimeType?.startsWith('audio/') || f.mimeType?.startsWith('video/')
      )
      if (audioFile) {
        externalId = audioFile.id
        fileReferenceId = audioFile.id
        durationSeconds = audioFile.durationSeconds
      }
    }

    if (!externalId) return errorResponse('No audio or video files found on this episode', 400)

    if (integration.provider === 'frame_io') {
      const frameRes = await fetch(
        `https://api.frame.io/v4/accounts/${accountId}/files/${externalId}?include=media_links.original,media_links.high_quality,media_links.efficient`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (!frameRes.ok) {
        const body = await frameRes.text()
        return errorResponse(`Frame.io API error ${frameRes.status}: ${body}`, 502)
      }
      const frameData = await frameRes.json()
      const fileData = frameData.data || frameData

      const notReady = ['uploading', 'processing', 'transcoding']
      if (fileData.status && notReady.includes(fileData.status)) {
        return errorResponse('File is still processing on Frame.io. Try again in a minute.', 409)
      }

      const ml = fileData.media_links || {}
      audioUrl = ml.original?.url || ml.high_quality?.url || ml.efficient?.url || null

      if (!audioUrl) {
        return errorResponse(`No download URL from Frame.io. Available media_links: ${Object.keys(ml).join(', ') || 'none'}. File status: ${fileData.status || 'unknown'}`, 502)
      }
    } else {
      const details = await provider.getFileDetails(token, accountId, externalId)
      audioUrl = details.viewUrl
      if (!audioUrl) return errorResponse('No download URL available for this file', 400)
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

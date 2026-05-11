import { NextRequest } from 'next/server'
import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'
import { getValidToken, getIntegrationAccountId } from '@/lib/integrations/token-refresh'
import { ensureProvidersRegistered } from '@/lib/integrations/init'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ episodeId: string; fileId: string }> }
) {
  const { episodeId, fileId } = await params
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

  const { data: fileRef } = await supabase!
    .from('file_references')
    .select('id, external_id, mime_type, duration_seconds, provider, name')
    .eq('external_id', fileId)
    .eq('episode_id', episodeId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!fileRef) return errorResponse('File not found', 404)

  ensureProvidersRegistered()

  if (fileRef.provider === 'frame_io') {
    const [token, accountId] = await Promise.all([
      getValidToken(org!.id, 'frame_io'),
      getIntegrationAccountId(org!.id, 'frame_io'),
    ])

    const frameRes = await fetch(
      `https://api.frame.io/v4/accounts/${accountId}/files/${fileRef.external_id}?include=media_links.high_quality,media_links.efficient`,
      { headers: { Authorization: `Bearer ${token}` } }
    )

    if (!frameRes.ok) return errorResponse(`Frame.io API error: ${frameRes.status}`, 502)

    const json = await frameRes.json()
    const fileData = json.data || json

    const notReady = ['uploading', 'processing', 'transcoding']
    if (fileData.status && notReady.includes(fileData.status)) {
      return jsonResponse({ status: 'processing', mime_type: fileRef.mime_type, name: fileRef.name })
    }

    const hq = fileData.media_links?.high_quality
    const eff = fileData.media_links?.efficient
    const url = hq?.url || hq?.download_url || eff?.url || eff?.download_url || null

    if (!url) return errorResponse('No playback URL available', 502)

    return jsonResponse({
      url,
      mime_type: fileRef.mime_type,
      duration_seconds: fileRef.duration_seconds,
      status: 'ready',
      name: fileRef.name,
      file_reference_id: fileRef.id,
    })
  }

  if (fileRef.provider === 'vimeo') {
    const token = await getValidToken(org!.id, 'vimeo')
    const res = await fetch(
      `https://api.vimeo.com/videos/${fileRef.external_id}?fields=files,status,duration`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.vimeo.*+json;version=3.4',
        },
      }
    )

    if (!res.ok) return errorResponse(`Vimeo API error: ${res.status}`, 502)

    const video = await res.json()
    if (video.status !== 'available') {
      return jsonResponse({ status: 'processing', mime_type: fileRef.mime_type, name: fileRef.name })
    }

    const files = video.files as Array<{ quality: string; link: string; type: string }> | undefined
    if (!files?.length) return errorResponse('No playback files available from Vimeo', 400)

    const preferred = files.find(f => f.quality === 'hd') || files.find(f => f.quality === 'sd') || files[0]
    return jsonResponse({
      url: preferred.link,
      mime_type: preferred.type || fileRef.mime_type,
      duration_seconds: video.duration || fileRef.duration_seconds,
      status: 'ready',
      name: fileRef.name,
      file_reference_id: fileRef.id,
    })
  }

  return errorResponse(`Preview not supported for provider: ${fileRef.provider}`, 400)
}

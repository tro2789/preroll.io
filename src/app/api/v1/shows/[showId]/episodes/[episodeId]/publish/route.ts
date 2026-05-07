import { NextRequest } from 'next/server'
import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'
import { decrypt } from '@/lib/integrations/crypto'
import { getValidToken, getIntegrationAccountId } from '@/lib/integrations/token-refresh'
import { ensureProvidersRegistered } from '@/lib/integrations/init'
import { authorizeUpload, createEpisode, publishEpisode } from '@/lib/integrations/providers/transistor'
import { dispatchWebhooks } from '@/lib/webhooks/dispatch'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ showId: string; episodeId: string }> }
) {
  const { showId, episodeId } = await params
  const { supabase, user, error } = await getAuthenticatedClient()
  if (error) return error

  const body = await request.json()
  const { title, description, episode_number, season_number, episode_type, scheduled_at, audio_source } = body

  // Validate required fields
  if (!title) return errorResponse('title is required', 400)
  if (!audio_source) return errorResponse('audio_source is required', 400)

  // Fetch Transistor distribution connection for this show
  const { data: connection, error: connError } = await supabase!
    .from('distribution_connections')
    .select('*')
    .eq('show_id', showId)
    .eq('provider', 'transistor')
    .single()

  if (connError || !connection) {
    return errorResponse('No Transistor distribution connection found for this show', 404)
  }

  // Decrypt the Transistor API key
  const apiKey = decrypt(connection.api_key_enc)

  // Resolve audio source
  let audioUrl: string

  if (audio_source.startsWith('deliverable:')) {
    // Download from Frame.io via deliverable reference
    const deliverableId = audio_source.slice('deliverable:'.length)

    // Get the Frame.io file reference for this deliverable
    const { data: fileRef, error: fileRefError } = await supabase!
      .from('file_references')
      .select('external_id, name')
      .eq('deliverable_id', deliverableId)
      .eq('provider', 'frame_io')
      .single()

    if (fileRefError || !fileRef) {
      return errorResponse('No Frame.io file reference found for this deliverable', 404)
    }

    // Get a valid Frame.io token
    ensureProvidersRegistered()
    const [frameToken, accountId] = await Promise.all([
      getValidToken(user!.id, 'frame_io'),
      getIntegrationAccountId(user!.id, 'frame_io'),
    ])

    // Fetch file metadata with media links from Frame.io V4 API
    const fileRes = await fetch(
      `https://api.frame.io/v4/accounts/${accountId}/files/${fileRef.external_id}?include=media_links.original`,
      { headers: { Authorization: `Bearer ${frameToken}` } }
    )

    if (!fileRes.ok) {
      const errBody = await fileRes.text()
      return errorResponse(`Frame.io API error ${fileRes.status}: ${errBody}`, 502)
    }

    const fileJson = await fileRes.json()
    const fileData = fileJson.data || fileJson
    const downloadUrl = fileData.media_links?.original?.url

    if (!downloadUrl) {
      return errorResponse('Could not resolve download URL from Frame.io', 502)
    }

    // Download the audio file
    const audioRes = await fetch(downloadUrl)
    if (!audioRes.ok) {
      return errorResponse(`Failed to download audio from Frame.io: ${audioRes.status}`, 502)
    }
    const audioBuffer = await audioRes.arrayBuffer()

    // Upload to Transistor
    const filename = fileRef.name || 'audio.mp3'
    const upload = await authorizeUpload(apiKey, filename)

    const uploadRes = await fetch(upload.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': upload.contentType },
      body: Buffer.from(audioBuffer),
    })

    if (!uploadRes.ok) {
      return errorResponse(`Failed to upload audio to Transistor: ${uploadRes.status}`, 502)
    }

    audioUrl = upload.audioUrl
  } else if (audio_source.startsWith('url:')) {
    audioUrl = audio_source.slice('url:'.length)
  } else {
    return errorResponse('audio_source must start with "deliverable:" or "url:"', 400)
  }

  // Create episode on Transistor
  const transistorEpisode = await createEpisode(apiKey, {
    showId: connection.external_show_id,
    title,
    audioUrl,
    description,
    number: episode_number,
    season: season_number,
    type: episode_type || 'full',
  })

  const transistorEpisodeId = transistorEpisode.id

  // Publish or schedule
  const publishResult = await publishEpisode(apiKey, transistorEpisodeId, {
    status: scheduled_at ? 'scheduled' : 'published',
    publishedAt: scheduled_at || undefined,
  })

  const mediaUrl = (publishResult as Record<string, unknown>).media_url as string | undefined
  const shareUrl = (publishResult as Record<string, unknown>).share_url as string | undefined

  await Promise.all([
    supabase!
      .from('episodes')
      .update({
        distribution_status: scheduled_at ? 'scheduled' : 'published',
        distribution_external_id: transistorEpisodeId,
        distribution_published_at: scheduled_at || new Date().toISOString(),
        distribution_metadata: {
          transistor_episode_id: transistorEpisodeId,
          media_url: mediaUrl,
          share_url: shareUrl,
        },
      })
      .eq('id', episodeId),
    supabase!.from('activity_log').insert({
      show_id: showId,
      episode_id: episodeId,
      action: scheduled_at ? 'episode_scheduled' : 'episode_published',
      description: scheduled_at
        ? `Episode '${title}' scheduled for ${scheduled_at}`
        : `Episode '${title}' published to Transistor`,
      metadata: {
        transistor_episode_id: transistorEpisodeId,
        audio_source,
      },
    }),
  ])

  dispatchWebhooks(user!.id, scheduled_at ? 'episode.scheduled' : 'episode.published', {
    episode_id: episodeId,
    show_id: showId,
    title,
    transistor_episode_id: transistorEpisodeId,
    media_url: mediaUrl,
    share_url: shareUrl,
    scheduled_at: scheduled_at || null,
  })

  return jsonResponse(
    {
      transistor_episode_id: transistorEpisodeId,
      status: scheduled_at ? 'scheduled' : 'published',
      media_url: mediaUrl,
      share_url: shareUrl,
    },
    201
  )
}

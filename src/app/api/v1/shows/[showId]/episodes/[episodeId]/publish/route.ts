import { NextRequest } from 'next/server'
import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'
import { decrypt } from '@/lib/integrations/crypto'
import { getValidToken, getIntegrationAccountId } from '@/lib/integrations/token-refresh'
import { ensureProvidersRegistered } from '@/lib/integrations/init'
import { authorizeUpload, createEpisode, publishEpisode } from '@/lib/integrations/providers/transistor'
import {
  createEpisode as createCastopodEpisode,
  publishEpisode as publishCastopodEpisode,
  slugify as castopodSlugify,
  type CastopodCredentials,
} from '@/lib/integrations/providers/castopod'
import { initiateVideoUpload } from '@/lib/integrations/providers/youtube-distribution'
import { dispatchWebhooks } from '@/lib/webhooks/dispatch'
import { getDistributionToken } from '@/lib/integrations/distribution-token'
import { getDownloadUrl } from '@/lib/r2/client'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ showId: string; episodeId: string }> }
) {
  const { showId, episodeId } = await params
  const { supabase, org, error } = await getAuthenticatedClient()
  if (error) return error

  const body = await request.json()
  const { provider: requestedProvider } = body

  const providerFilter = requestedProvider || 'transistor'
  const { data: connection, error: connError } = await supabase!
    .from('distribution_connections')
    .select('*')
    .eq('show_id', showId)
    .eq('provider', providerFilter)
    .single()

  if (connError || !connection) {
    return errorResponse(`No ${providerFilter} distribution connection found for this show`, 404)
  }

  if (connection.provider === 'youtube') {
    return handleYouTubePublish(supabase!, org!, showId, episodeId, connection, body)
  }

  if (connection.provider === 'castopod') {
    return handleCastopodPublish(supabase!, org!, showId, episodeId, connection, body)
  }

  return handleTransistorPublish(supabase!, org!, showId, episodeId, connection, body)
}

async function handleTransistorPublish(
  supabase: any,
  org: { id: string },
  showId: string,
  episodeId: string,
  connection: any,
  body: any,
) {
  const { title, description, episode_number, season_number, episode_type, scheduled_at, audio_source } = body

  if (!title) return errorResponse('title is required', 400)
  if (!audio_source) return errorResponse('audio_source is required', 400)

  const apiKey = decrypt(connection.api_key_enc)
  let audioUrl: string

  if (audio_source.startsWith('url:')) {
    audioUrl = audio_source.slice('url:'.length)
  } else {
    const resolved = await resolveAudioBuffer(supabase, org.id, audio_source)
    if ('error' in resolved) return resolved.error

    const upload = await authorizeUpload(apiKey, resolved.filename)
    const uploadRes = await fetch(upload.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': upload.contentType },
      body: Buffer.from(resolved.buffer),
    })

    if (!uploadRes.ok) {
      return errorResponse(`Failed to upload to Transistor: ${uploadRes.status}`, 502)
    }

    audioUrl = upload.audioUrl
  }

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

  const publishResult = await publishEpisode(apiKey, transistorEpisodeId, {
    status: scheduled_at ? 'scheduled' : 'published',
    publishedAt: scheduled_at || undefined,
  })

  const mediaUrl = (publishResult as Record<string, unknown>).media_url as string | undefined
  const shareUrl = (publishResult as Record<string, unknown>).share_url as string | undefined

  await Promise.all([
    supabase
      .from('episodes')
      .update({
        distribution_status: scheduled_at ? 'scheduled' : 'published',
        distribution_external_id: transistorEpisodeId,
        distribution_published_at: scheduled_at || new Date().toISOString(),
        distribution_metadata: {
          provider: 'transistor',
          transistor_episode_id: transistorEpisodeId,
          media_url: mediaUrl,
          share_url: shareUrl,
        },
      })
      .eq('id', episodeId),
    supabase.from('activity_log').insert({
      show_id: showId,
      episode_id: episodeId,
      action: scheduled_at ? 'episode_scheduled' : 'episode_published',
      description: scheduled_at
        ? `Episode '${title}' scheduled for ${scheduled_at}`
        : `Episode '${title}' published to Transistor`,
      metadata: { transistor_episode_id: transistorEpisodeId, audio_source: body.audio_source },
    }),
  ])

  dispatchWebhooks(org.id, scheduled_at ? 'episode.scheduled' : 'episode.published', {
    episode_id: episodeId,
    show_id: showId,
    title,
    provider: 'transistor',
    transistor_episode_id: transistorEpisodeId,
    media_url: mediaUrl,
    share_url: shareUrl,
    scheduled_at: scheduled_at || null,
  })

  return jsonResponse({
    provider: 'transistor',
    transistor_episode_id: transistorEpisodeId,
    status: scheduled_at ? 'scheduled' : 'published',
    media_url: mediaUrl,
    share_url: shareUrl,
  }, 201)
}

async function handleCastopodPublish(
  supabase: any,
  org: { id: string },
  showId: string,
  episodeId: string,
  connection: any,
  body: any,
) {
  const { title, description, episode_number, season_number, episode_type, scheduled_at, audio_source } = body

  if (!title) return errorResponse('title is required', 400)
  if (!audio_source) return errorResponse('audio_source is required', 400)

  const creds: CastopodCredentials = JSON.parse(decrypt(connection.api_key_enc))

  const resolved = await resolveAudioBuffer(supabase, org.id, audio_source)
  if ('error' in resolved) return resolved.error

  // Castopod only accepts .mp3 and .m4a — normalize the filename
  let audioFilename = resolved.filename
  if (!audioFilename.endsWith('.mp3') && !audioFilename.endsWith('.m4a')) {
    audioFilename = audioFilename.replace(/\.[^.]+$/, '') + '.mp3'
  }

  let castopodEpisode
  try {
    castopodEpisode = await createCastopodEpisode(creds, {
      podcastId: Number(connection.external_show_id),
      title,
      slug: castopodSlugify(title),
      audioFile: resolved.buffer,
      audioFilename,
      createdBy: creds.userId ?? 1,
      description,
      episodeNumber: episode_number,
      seasonNumber: season_number,
      episodeType: episode_type || 'full',
    })
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'Unknown error'
    return errorResponse(`Castopod publish failed: ${detail}`, 502)
  }

  const castopodEpisodeId = castopodEpisode.id

  try {
    if (scheduled_at) {
      const date = new Date(scheduled_at)
      const formatted = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
      await publishCastopodEpisode(creds, castopodEpisodeId, {
        method: 'schedule',
        scheduledDate: formatted,
        createdBy: creds.userId ?? 1,
      })
    } else {
      await publishCastopodEpisode(creds, castopodEpisodeId, {
        method: 'now',
        createdBy: creds.userId ?? 1,
      })
    }
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'Unknown error'
    return errorResponse(`Episode created on Castopod but publish step failed: ${detail}`, 502)
  }

  const episodeUrl = castopodEpisode.guid || ''

  await Promise.all([
    supabase
      .from('episodes')
      .update({
        distribution_status: scheduled_at ? 'scheduled' : 'published',
        distribution_external_id: String(castopodEpisodeId),
        distribution_published_at: scheduled_at || new Date().toISOString(),
        distribution_metadata: {
          provider: 'castopod',
          castopod_episode_id: castopodEpisodeId,
          instance_url: creds.instanceUrl,
          share_url: episodeUrl,
        },
      })
      .eq('id', episodeId),
    supabase.from('activity_log').insert({
      show_id: showId,
      episode_id: episodeId,
      action: scheduled_at ? 'episode_scheduled' : 'episode_published',
      description: scheduled_at
        ? `Episode '${title}' scheduled on Castopod for ${scheduled_at}`
        : `Episode '${title}' published to Castopod`,
      metadata: { castopod_episode_id: castopodEpisodeId, audio_source: body.audio_source },
    }),
  ])

  dispatchWebhooks(org.id, scheduled_at ? 'episode.scheduled' : 'episode.published', {
    episode_id: episodeId,
    show_id: showId,
    title,
    provider: 'castopod',
    castopod_episode_id: castopodEpisodeId,
    share_url: episodeUrl,
    scheduled_at: scheduled_at || null,
  })

  return jsonResponse({
    provider: 'castopod',
    castopod_episode_id: castopodEpisodeId,
    status: scheduled_at ? 'scheduled' : 'published',
    share_url: episodeUrl,
  }, 201)
}

async function handleYouTubePublish(
  supabase: any,
  org: { id: string },
  showId: string,
  episodeId: string,
  connection: any,
  body: any,
) {
  const {
    title,
    description,
    tags,
    category_id,
    privacy_status = 'public',
    scheduled_at,
    video_source,
  } = body

  if (!title) return errorResponse('title is required', 400)
  if (!video_source) return errorResponse('video_source is required', 400)

  ensureProvidersRegistered()

  let ytToken: string

  const distToken = await getDistributionToken(connection)
  if (distToken) {
    ytToken = distToken
  } else {
    try {
      ytToken = await getValidToken(org.id, 'youtube')
    } catch {
      return errorResponse('YouTube OAuth token not found. Reconnect YouTube in Settings or ask the client to reconnect.', 401)
    }
  }

  const downloadUrl = await resolveSourceDownloadUrl(supabase, org.id, video_source)
  if ('error' in downloadUrl) return downloadUrl.error
  const { url: sourceUrl, mimeType, fileSize } = downloadUrl

  const resumableUrl = await initiateVideoUpload(
    ytToken,
    {
      title,
      description,
      tags,
      categoryId: category_id,
      privacyStatus: privacy_status,
      scheduledAt: scheduled_at,
      madeForKids: false,
    },
    fileSize,
    mimeType,
  )

  // Return URLs to client for browser-side upload
  return jsonResponse({
    provider: 'youtube',
    mode: 'client_upload',
    resumableUrl,
    downloadUrl: sourceUrl,
    mimeType,
    fileSize,
    episodeId,
    showId,
    title,
    privacy_status,
    scheduled_at,
    channel_id: connection.external_show_id,
  })
}

type SourceUrlResult =
  | { url: string; mimeType: string; fileSize: number }
  | { error: Response }

async function resolveSourceDownloadUrl(
  supabase: any,
  orgId: string,
  videoSource: string,
): Promise<SourceUrlResult> {
  if (videoSource.startsWith('file:')) {
    const fileId = videoSource.slice('file:'.length)
    const { data: fileRef, error: fileRefError } = await supabase
      .from('file_references')
      .select('external_id, name, mime_type, file_size, provider')
      .eq('id', fileId)
      .single()

    if (fileRefError || !fileRef) {
      return { error: errorResponse('File not found', 404) }
    }

    const downloadResult = await resolveDownloadUrl(orgId, fileRef)
    if (!downloadResult) {
      return { error: errorResponse(`Could not resolve download URL from ${fileRef.provider}`, 502) }
    }

    return {
      url: downloadResult.url,
      mimeType: fileRef.mime_type || 'video/mp4',
      fileSize: fileRef.file_size || 0,
    }
  }

  if (videoSource.startsWith('url:')) {
    const url = videoSource.slice('url:'.length)
    const headRes = await fetch(url, { method: 'HEAD' })
    return {
      url,
      mimeType: headRes.headers.get('content-type') || 'video/mp4',
      fileSize: parseInt(headRes.headers.get('content-length') || '0', 10),
    }
  }

  return { error: errorResponse('video_source must start with "file:" or "url:"', 400) }
}

type AudioBufferResult =
  | { buffer: ArrayBuffer; filename: string }
  | { error: Response }

async function resolveAudioBuffer(
  supabase: any,
  orgId: string,
  audioSource: string,
): Promise<AudioBufferResult> {
  if (audioSource.startsWith('file:')) {
    const fileId = audioSource.slice('file:'.length)
    const { data: fileRef, error: fileRefError } = await supabase
      .from('file_references')
      .select('external_id, name, mime_type, file_size, provider')
      .eq('id', fileId)
      .single()

    if (fileRefError || !fileRef) {
      return { error: errorResponse('File not found', 404) }
    }

    const downloadResult = await resolveDownloadUrl(orgId, fileRef)
    if (!downloadResult) {
      return { error: errorResponse(`Could not resolve download URL from ${fileRef.provider}`, 502) }
    }

    const audioRes = await fetch(downloadResult.url, {
      headers: downloadResult.headers || {},
    })
    if (!audioRes.ok) {
      return { error: errorResponse(`Failed to download file: ${audioRes.status}`, 502) }
    }

    return {
      buffer: await audioRes.arrayBuffer(),
      filename: fileRef.name || 'episode.mp3',
    }
  }

  if (audioSource.startsWith('url:')) {
    const url = audioSource.slice('url:'.length)
    const audioRes = await fetch(url)
    if (!audioRes.ok) {
      return { error: errorResponse(`Failed to download audio from URL: ${audioRes.status}`, 502) }
    }
    return {
      buffer: await audioRes.arrayBuffer(),
      filename: url.split('/').pop() || 'episode.mp3',
    }
  }

  return { error: errorResponse('audio_source must start with "file:" or "url:"', 400) }
}

async function resolveDownloadUrl(
  orgId: string,
  fileRef: { external_id: string; provider: string },
): Promise<{ url: string; headers?: Record<string, string> } | null> {
  if (fileRef.provider === 'r2') {
    const url = await getDownloadUrl(fileRef.external_id)
    return { url }
  }

  ensureProvidersRegistered()

  if (fileRef.provider === 'frame_io') {
    const [frameToken, accountId] = await Promise.all([
      getValidToken(orgId, 'frame_io'),
      getIntegrationAccountId(orgId, 'frame_io'),
    ])
    const fileRes = await fetch(
      `https://api.frame.io/v4/accounts/${accountId}/files/${fileRef.external_id}?include=media_links.original`,
      { headers: { Authorization: `Bearer ${frameToken}` } }
    )
    if (!fileRes.ok) return null
    const fileJson = await fileRes.json()
    const fileData = fileJson.data || fileJson
    const url = fileData.media_links?.original?.url
    return url ? { url } : null
  }

  if (fileRef.provider === 'google_drive') {
    const driveToken = await getValidToken(orgId, 'google_drive')
    return {
      url: `https://www.googleapis.com/drive/v3/files/${fileRef.external_id}?alt=media`,
      headers: { Authorization: `Bearer ${driveToken}` },
    }
  }

  return null
}

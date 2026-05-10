const YT_API = 'https://www.googleapis.com/youtube/v3'
const YT_UPLOAD = 'https://www.googleapis.com/upload/youtube/v3'

async function ytApiFetch(path: string, token: string, options?: RequestInit) {
  const url = path.startsWith('http') ? path : `${YT_API}${path}`
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`YouTube API error ${res.status}: ${body}`)
  }
  return res
}

async function ytApiJson(path: string, token: string, options?: RequestInit) {
  const res = await ytApiFetch(path, token, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  })
  return res.json()
}

export interface YouTubeChannel {
  id: string
  name: string
  thumbnailUrl?: string
}

export interface YouTubeUploadResult {
  videoId: string
  viewUrl: string
}

export interface PublishToYouTubeParams {
  title: string
  description?: string
  tags?: string[]
  categoryId?: string
  privacyStatus: 'public' | 'unlisted' | 'private'
  scheduledAt?: string
  playlistId?: string
  madeForKids?: boolean
}

export async function listChannels(token: string): Promise<YouTubeChannel[]> {
  const data = await ytApiJson('/channels?part=snippet&mine=true&maxResults=50', token)
  return (data.items || []).map((ch: Record<string, unknown>) => {
    const snippet = ch.snippet as Record<string, unknown>
    const thumbnails = snippet?.thumbnails as Record<string, Record<string, unknown>> | undefined
    return {
      id: ch.id as string,
      name: (snippet?.title as string) || 'Unknown Channel',
      thumbnailUrl: thumbnails?.default?.url as string | undefined,
    }
  })
}

export async function initiateVideoUpload(
  token: string,
  params: PublishToYouTubeParams,
  fileSize: number,
  mimeType: string = 'video/mp4'
): Promise<string> {
  // YouTube uses privacyStatus=private + publishAt for scheduled videos
  const isScheduled = params.privacyStatus === 'public' && params.scheduledAt
  const metadata = {
    snippet: {
      title: params.title,
      description: params.description || '',
      tags: params.tags || [],
      categoryId: params.categoryId || '22',
    },
    status: {
      privacyStatus: isScheduled ? 'private' : params.privacyStatus,
      publishAt: isScheduled ? params.scheduledAt : undefined,
      selfDeclaredMadeForKids: params.madeForKids ?? false,
    },
  }

  const res = await ytApiFetch(
    `${YT_UPLOAD}/videos?uploadType=resumable&part=snippet,status`,
    token,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Upload-Content-Length': String(fileSize),
        'X-Upload-Content-Type': mimeType,
      },
      body: JSON.stringify(metadata),
    }
  )

  const resumableUrl = res.headers.get('location')
  if (!resumableUrl) throw new Error('YouTube did not return a resumable upload URL')
  return resumableUrl
}

export async function uploadVideoBytes(
  resumableUrl: string,
  videoBuffer: ArrayBuffer,
  mimeType: string = 'video/mp4'
): Promise<YouTubeUploadResult> {
  const res = await fetch(resumableUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': mimeType,
      'Content-Length': String(videoBuffer.byteLength),
    },
    body: videoBuffer,
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`YouTube upload failed ${res.status}: ${body}`)
  }

  const data = await res.json()
  return {
    videoId: data.id,
    viewUrl: `https://youtube.com/watch?v=${data.id}`,
  }
}

export async function setThumbnail(
  token: string,
  videoId: string,
  thumbnailBuffer: ArrayBuffer,
  mimeType: string = 'image/jpeg'
): Promise<void> {
  const res = await fetch(`${YT_UPLOAD}/thumbnails/set?videoId=${videoId}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': mimeType,
    },
    body: thumbnailBuffer,
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`YouTube thumbnail upload failed ${res.status}: ${body}`)
  }
}

export async function addToPlaylist(
  token: string,
  playlistId: string,
  videoId: string
): Promise<void> {
  await ytApiJson('/playlistItems?part=snippet', token, {
    method: 'POST',
    body: JSON.stringify({
      snippet: {
        playlistId,
        resourceId: { kind: 'youtube#video', videoId },
      },
    }),
  })
}

export async function updateVideo(
  token: string,
  videoId: string,
  updates: {
    title?: string
    description?: string
    tags?: string[]
    categoryId?: string
    privacyStatus?: 'public' | 'unlisted' | 'private'
    publishAt?: string
  }
): Promise<void> {
  const current = await ytApiJson(`/videos?part=snippet,status&id=${videoId}`, token)
  const video = current.items?.[0]
  if (!video) throw new Error('Video not found')

  const snippet = { ...video.snippet }
  const status = { ...video.status }

  if (updates.title !== undefined) snippet.title = updates.title
  if (updates.description !== undefined) snippet.description = updates.description
  if (updates.tags !== undefined) snippet.tags = updates.tags
  if (updates.categoryId !== undefined) snippet.categoryId = updates.categoryId
  if (updates.privacyStatus !== undefined) status.privacyStatus = updates.privacyStatus
  if (updates.publishAt !== undefined) status.publishAt = updates.publishAt

  await ytApiJson('/videos?part=snippet,status', token, {
    method: 'PUT',
    body: JSON.stringify({ id: videoId, snippet, status }),
  })
}

export async function getVideoStatus(
  token: string,
  videoId: string
): Promise<{ status: string; privacyStatus: string; uploadStatus: string }> {
  const data = await ytApiJson(`/videos?part=status,processingDetails&id=${videoId}`, token)
  const video = data.items?.[0]
  if (!video) throw new Error('Video not found')
  return {
    status: video.processingDetails?.processingStatus || 'unknown',
    privacyStatus: video.status?.privacyStatus || 'unknown',
    uploadStatus: video.status?.uploadStatus || 'unknown',
  }
}

export async function listPlaylists(
  token: string
): Promise<{ id: string; title: string }[]> {
  const data = await ytApiJson('/playlists?part=snippet&mine=true&maxResults=50', token)
  return (data.items || []).map((pl: Record<string, unknown>) => ({
    id: pl.id as string,
    title: ((pl.snippet as Record<string, unknown>)?.title as string) || 'Untitled',
  }))
}

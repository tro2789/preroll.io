/**
 * Castopod REST API client
 *
 * Castopod is a self-hosted, open-source podcast hosting platform.
 * Uses HTTP Basic Auth. Audio files must be uploaded inline (multipart/form-data).
 *
 * API base: {instanceUrl}/api/rest/v1
 * Docs: https://docs.castopod.org/next/en/api/
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CastopodPodcast {
  id: number
  title: string
  description?: string
  link?: string
}

export interface CastopodEpisode {
  id: number
  title: string
  slug: string
  podcast_id: number
  audio_url?: string
  description_html?: string
  published_at?: string | null
}

export interface CastopodCredentials {
  instanceUrl: string
  username: string
  password: string
  userId?: number
}

export interface CreateCastopodEpisodeParams {
  podcastId: number
  title: string
  slug: string
  audioFile: Buffer | ArrayBuffer
  audioFilename: string
  createdBy: number
  description?: string
  episodeNumber?: number
  seasonNumber?: number
  episodeType?: 'full' | 'trailer' | 'bonus'
}

export interface PublishCastopodEpisodeParams {
  method: 'now' | 'schedule'
  scheduledDate?: string
  clientTimezone?: string
  createdBy: number
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function apiUrl(creds: CastopodCredentials, path: string): string {
  const base = creds.instanceUrl.replace(/\/+$/, '')
  return `${base}/api/rest/v1${path}`
}

function authHeader(creds: CastopodCredentials): string {
  const encoded = Buffer.from(`${creds.username}:${creds.password}`).toString('base64')
  return `Basic ${encoded}`
}

async function castopodFetch(
  creds: CastopodCredentials,
  path: string,
  options?: RequestInit,
): Promise<unknown> {
  const res = await fetch(apiUrl(creds, path), {
    ...options,
    headers: {
      Authorization: authHeader(creds),
      ...options?.headers,
    },
  })
  if (!res.ok) {
    const body = await res.text()
    const preview = body.length > 200 ? body.slice(0, 200) + '...' : body
    throw new Error(`Castopod API error ${res.status}: ${preview}`)
  }
  return res.json()
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

export async function listPodcasts(creds: CastopodCredentials): Promise<CastopodPodcast[]> {
  const json = (await castopodFetch(creds, '/podcasts')) as CastopodPodcast[]
  return json.map((p) => ({
    id: p.id,
    title: p.title,
    description: p.description,
    link: p.link,
  }))
}

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 128)
}

export async function createEpisode(
  creds: CastopodCredentials,
  params: CreateCastopodEpisodeParams,
): Promise<CastopodEpisode> {
  const form = new FormData()
  form.append('podcast_id', String(params.podcastId))
  form.append('title', params.title)
  form.append('slug', params.slug || slugify(params.title))
  form.append('created_by', String(params.createdBy))
  form.append('updated_by', String(params.createdBy))

  const ab = params.audioFile instanceof ArrayBuffer
    ? params.audioFile
    : params.audioFile.buffer.slice(params.audioFile.byteOffset, params.audioFile.byteOffset + params.audioFile.byteLength)
  const mimeType = params.audioFilename.endsWith('.m4a') ? 'audio/mp4' : 'audio/mpeg'
  const blob = new Blob([ab as ArrayBuffer], { type: mimeType })
  form.append('audio_file', blob, params.audioFilename)

  form.append('description', params.description || '')
  form.append('type', params.episodeType || 'full')
  if (params.episodeNumber !== undefined) form.append('episode_number', String(params.episodeNumber))
  if (params.seasonNumber !== undefined) form.append('season_number', String(params.seasonNumber))

  const json = (await castopodFetch(creds, '/episodes', {
    method: 'POST',
    body: form,
  })) as CastopodEpisode

  return json
}

export async function publishEpisode(
  creds: CastopodCredentials,
  episodeId: number,
  params: PublishCastopodEpisodeParams,
): Promise<CastopodEpisode> {
  const form = new FormData()
  form.append('publication_method', params.method)
  form.append('created_by', String(params.createdBy))

  if (params.method === 'schedule' && params.scheduledDate) {
    form.append('scheduled_publication_date', params.scheduledDate)
    if (params.clientTimezone) {
      form.append('client_timezone', params.clientTimezone)
    }
  }

  const json = (await castopodFetch(creds, `/episodes/${episodeId}/publish`, {
    method: 'POST',
    body: form,
  })) as CastopodEpisode

  return json
}

export async function getEpisode(
  creds: CastopodCredentials,
  episodeId: number,
): Promise<CastopodEpisode> {
  const json = (await castopodFetch(creds, `/episodes/${episodeId}`)) as CastopodEpisode
  return json
}

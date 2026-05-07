/**
 * Transistor.fm API client
 *
 * Standalone module for Transistor.fm podcast hosting operations.
 * Uses API key auth (not OAuth) and JSON:API response format.
 *
 * API docs: https://developers.transistor.fm
 * Rate limit: 10 requests per 10 seconds
 */

const TRANSISTOR_API = 'https://api.transistor.fm/v1'

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

async function transistorFetch(path: string, apiKey: string, options?: RequestInit) {
  const res = await fetch(`${TRANSISTOR_API}${path}`, {
    ...options,
    headers: { 'x-api-key': apiKey, ...options?.headers },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Transistor API error ${res.status}: ${body}`)
  }
  return res.json()
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TransistorUser {
  id: string
  name: string
  email: string
}

export interface TransistorShow {
  id: string
  name: string
}

export interface TransistorUploadAuth {
  uploadUrl: string
  audioUrl: string
  contentType: string
}

export interface CreateEpisodeParams {
  showId: string
  title: string
  audioUrl: string
  description?: string
  number?: number
  season?: number
  type?: 'full' | 'trailer' | 'bonus'
}

export interface TransistorEpisode {
  id: string
  attributes: Record<string, unknown>
}

export interface PublishEpisodeParams {
  status: 'published' | 'scheduled' | 'draft'
  publishedAt?: string // ISO datetime
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

/**
 * Verify an API key by fetching the authenticated user.
 * GET /v1 → returns user data from the JSON:API response.
 */
export async function verifyApiKey(apiKey: string): Promise<TransistorUser> {
  const json = await transistorFetch('', apiKey)
  const attrs = json.data.attributes
  return {
    id: String(json.data.id),
    name: attrs.name,
    email: attrs.email,
  }
}

/**
 * List all shows for the authenticated account.
 * GET /v1/shows → returns array of { id, name }.
 */
export async function listShows(apiKey: string): Promise<TransistorShow[]> {
  const json = await transistorFetch('/shows', apiKey)
  return (json.data || []).map((show: Record<string, unknown>) => ({
    id: String(show.id),
    name: (show.attributes as Record<string, unknown>).title as string,
  }))
}

/**
 * Get a pre-signed upload URL for an audio file.
 * GET /v1/episodes/authorize_upload?filename=X
 */
export async function authorizeUpload(apiKey: string, filename: string): Promise<TransistorUploadAuth> {
  const params = new URLSearchParams({ filename })
  const json = await transistorFetch(`/episodes/authorize_upload?${params.toString()}`, apiKey)
  const attrs = json.data.attributes
  return {
    uploadUrl: attrs.upload_url,
    audioUrl: attrs.audio_url,
    contentType: attrs.content_type,
  }
}

/**
 * Create a new episode on a show.
 * POST /v1/episodes with form-encoded body.
 */
export async function createEpisode(apiKey: string, params: CreateEpisodeParams): Promise<TransistorEpisode> {
  const body = new URLSearchParams()
  body.set('episode[show_id]', params.showId)
  body.set('episode[title]', params.title)
  body.set('episode[audio_url]', params.audioUrl)
  if (params.description !== undefined) body.set('episode[description]', params.description)
  if (params.number !== undefined) body.set('episode[number]', String(params.number))
  if (params.season !== undefined) body.set('episode[season]', String(params.season))
  if (params.type !== undefined) body.set('episode[type]', params.type)

  const json = await transistorFetch('/episodes', apiKey, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  return {
    id: String(json.data.id),
    attributes: json.data.attributes,
  }
}

/**
 * Publish, schedule, or draft an episode.
 * PATCH /v1/episodes/:id/publish with form-encoded body.
 */
export async function publishEpisode(
  apiKey: string,
  episodeId: string,
  params: PublishEpisodeParams,
): Promise<Record<string, unknown>> {
  const body = new URLSearchParams()
  body.set('episode[status]', params.status)
  if (params.publishedAt !== undefined) body.set('episode[published_at]', params.publishedAt)

  const json = await transistorFetch(`/episodes/${episodeId}/publish`, apiKey, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  return json.data.attributes
}

/**
 * Get a single episode by ID.
 * GET /v1/episodes/:id → returns episode attributes.
 */
export async function getEpisode(apiKey: string, episodeId: string): Promise<Record<string, unknown>> {
  const json = await transistorFetch(`/episodes/${episodeId}`, apiKey)
  return json.data.attributes
}

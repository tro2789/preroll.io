import { NextRequest } from 'next/server'
import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'
import { encrypt } from '@/lib/integrations/crypto'
import { verifyApiKey, listShows } from '@/lib/integrations/providers/transistor'
import { listPodcasts } from '@/lib/integrations/providers/castopod'
import { listChannels } from '@/lib/integrations/providers/youtube-distribution'
import { ytJson } from '@/lib/integrations/providers/youtube'
import { getValidToken } from '@/lib/integrations/token-refresh'
import { ensureProvidersRegistered } from '@/lib/integrations/init'

const SUPPORTED_PROVIDERS = ['transistor', 'youtube', 'castopod']

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ showId: string }> }
) {
  const { showId } = await params
  const { supabase, org, error } = await getAuthenticatedClient()
  if (error) return error

  const body = await request.json()
  const { provider, api_key, external_show_id } = body

  if (!SUPPORTED_PROVIDERS.includes(provider)) {
    return errorResponse(`Unsupported provider. Supported: ${SUPPORTED_PROVIDERS.join(', ')}`, 400)
  }

  if (provider === 'transistor') {
    if (!api_key) return errorResponse('api_key is required', 400)

    try {
      await verifyApiKey(api_key)
    } catch {
      return errorResponse('Invalid Transistor API key', 401)
    }

    const shows = await listShows(api_key)
    let selectedShow: { id: string; name: string }

    if (external_show_id) {
      const found = shows.find((s) => s.id === external_show_id)
      if (!found) return errorResponse('Show not found on Transistor account', 404)
      selectedShow = found
    } else if (shows.length === 0) {
      return errorResponse('No shows found on this Transistor account', 404)
    } else if (shows.length === 1) {
      selectedShow = shows[0]
    } else {
      return jsonResponse({ needs_selection: true, shows })
    }

    const { data, error: dbError } = await supabase!
      .from('distribution_connections')
      .upsert(
        {
          show_id: showId,
          provider: 'transistor',
          external_show_id: selectedShow.id,
          external_show_name: selectedShow.name,
          api_key_enc: encrypt(api_key),
        },
        { onConflict: 'show_id,provider' }
      )
      .select('id, provider, external_show_id, external_show_name, created_at')
      .single()

    if (dbError) return errorResponse(dbError.message, 500)
    return jsonResponse(data, 201)
  }

  if (provider === 'castopod') {
    const { instance_url, username, password, external_show_id: castopodShowId } = body
    if (!instance_url) return errorResponse('instance_url is required', 400)
    if (!username) return errorResponse('username is required', 400)
    if (!password) return errorResponse('password is required', 400)

    const creds = { instanceUrl: instance_url, username, password }

    let podcasts: Awaited<ReturnType<typeof listPodcasts>>
    try {
      podcasts = await listPodcasts(creds)
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'Unknown error'
      return errorResponse(`Could not connect to Castopod: ${detail}`, 401)
    }

    let selectedPodcast: { id: number; name: string }

    if (castopodShowId) {
      const found = podcasts.find((p) => String(p.id) === String(castopodShowId))
      if (!found) return errorResponse('Podcast not found on this Castopod instance', 404)
      selectedPodcast = { id: found.id, name: found.title }
    } else if (podcasts.length === 0) {
      return errorResponse('No podcasts found on this Castopod instance. Create one in the Castopod admin first.', 404)
    } else if (podcasts.length === 1) {
      selectedPodcast = { id: podcasts[0].id, name: podcasts[0].title }
    } else {
      return jsonResponse({
        needs_selection: true,
        shows: podcasts.map((p) => ({ id: String(p.id), name: p.title })),
      })
    }

    const encCredentials = encrypt(JSON.stringify({ instanceUrl: instance_url, username, password }))

    const { data, error: dbError } = await supabase!
      .from('distribution_connections')
      .upsert(
        {
          show_id: showId,
          provider: 'castopod',
          external_show_id: String(selectedPodcast.id),
          external_show_name: selectedPodcast.name,
          api_key_enc: encCredentials,
        },
        { onConflict: 'show_id,provider' }
      )
      .select('id, provider, external_show_id, external_show_name, created_at')
      .single()

    if (dbError) return errorResponse(dbError.message, 500)
    return jsonResponse(data, 201)
  }

  if (provider === 'youtube') {
    ensureProvidersRegistered()

    let token: string
    try {
      token = await getValidToken(org!.id, 'youtube')
    } catch {
      return errorResponse(
        'YouTube is not connected. Go to Settings > Integrations to connect your YouTube account first.',
        400
      )
    }

    const channels = await listChannels(token)

    let selectedChannel: { id: string; name: string }

    if (external_show_id) {
      const found = channels.find((c) => c.id === external_show_id)
      if (found) {
        selectedChannel = { id: found.id, name: found.name }
      } else {
        try {
          const data = await ytJson(`/channels?part=snippet&id=${external_show_id}`, token)
          const ch = data.items?.[0]
          if (!ch) return errorResponse('Channel not found. Check the channel ID and try again.', 404)
          selectedChannel = {
            id: ch.id as string,
            name: (ch.snippet as Record<string, unknown>)?.title as string || 'YouTube Channel',
          }
        } catch {
          return errorResponse('Could not verify channel. Check the channel ID and try again.', 400)
        }
      }
    } else {
      return jsonResponse({
        needs_selection: true,
        channels: channels.map((c) => ({ id: c.id, name: c.name })),
      })
    }

    const { data, error: dbError } = await supabase!
      .from('distribution_connections')
      .upsert(
        {
          show_id: showId,
          provider: 'youtube',
          external_show_id: selectedChannel.id,
          external_show_name: selectedChannel.name,
          api_key_enc: encrypt('oauth:youtube'),
          connected_by: 'producer',
        },
        { onConflict: 'show_id,provider' }
      )
      .select('id, provider, external_show_id, external_show_name, connected_by, created_at')
      .single()

    if (dbError) return errorResponse(dbError.message, 500)
    return jsonResponse(data, 201)
  }

  return errorResponse('Unknown provider', 400)
}

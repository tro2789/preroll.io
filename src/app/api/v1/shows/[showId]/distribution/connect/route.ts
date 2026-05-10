import { NextRequest } from 'next/server'
import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'
import { encrypt } from '@/lib/integrations/crypto'
import { verifyApiKey, listShows } from '@/lib/integrations/providers/transistor'
import { listChannels } from '@/lib/integrations/providers/youtube-distribution'
import { getValidToken } from '@/lib/integrations/token-refresh'
import { ensureProvidersRegistered } from '@/lib/integrations/init'

const SUPPORTED_PROVIDERS = ['transistor', 'youtube']

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
    if (channels.length === 0) {
      return errorResponse('No YouTube channels found for this account', 404)
    }

    let selectedChannel: { id: string; name: string }

    if (external_show_id) {
      const found = channels.find((c) => c.id === external_show_id)
      if (!found) return errorResponse('Channel not found', 404)
      selectedChannel = { id: found.id, name: found.name }
    } else if (channels.length === 1) {
      selectedChannel = { id: channels[0].id, name: channels[0].name }
    } else {
      return jsonResponse({
        needs_selection: true,
        shows: channels.map((c) => ({ id: c.id, name: c.name })),
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
        },
        { onConflict: 'show_id,provider' }
      )
      .select('id, provider, external_show_id, external_show_name, created_at')
      .single()

    if (dbError) return errorResponse(dbError.message, 500)
    return jsonResponse(data, 201)
  }

  return errorResponse('Unknown provider', 400)
}

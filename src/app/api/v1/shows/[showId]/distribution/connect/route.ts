import { NextRequest } from 'next/server'
import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'
import { encrypt } from '@/lib/integrations/crypto'
import { verifyApiKey, listShows } from '@/lib/integrations/providers/transistor'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ showId: string }> }
) {
  const { showId } = await params
  const { supabase, error } = await getAuthenticatedClient()
  if (error) return error

  const body = await request.json()
  const { provider, api_key, external_show_id } = body

  if (provider !== 'transistor') {
    return errorResponse('Only "transistor" provider is currently supported', 400)
  }

  if (!api_key) {
    return errorResponse('api_key is required', 400)
  }

  // Verify the API key is valid
  try {
    await verifyApiKey(api_key)
  } catch {
    return errorResponse('Invalid Transistor API key', 401)
  }

  // Fetch the list of shows from Transistor
  const shows = await listShows(api_key)

  if (external_show_id) {
    // Verify the selected show exists
    const selectedShow = shows.find((s) => s.id === external_show_id)
    if (!selectedShow) {
      return errorResponse('Show not found on Transistor account', 404)
    }

    const encryptedKey = encrypt(api_key)
    const { data, error: dbError } = await supabase!
      .from('distribution_connections')
      .upsert(
        {
          show_id: showId,
          provider: 'transistor',
          external_show_id: selectedShow.id,
          external_show_name: selectedShow.name,
          encrypted_api_key: encryptedKey,
        },
        { onConflict: 'show_id,provider' }
      )
      .select('id, provider, external_show_id, external_show_name, created_at')
      .single()

    if (dbError) return errorResponse(dbError.message, 500)

    return jsonResponse(data, 201)
  }

  // No external_show_id provided — determine next step based on show count
  if (shows.length === 0) {
    return errorResponse('No shows found on this Transistor account', 404)
  }

  if (shows.length === 1) {
    // Auto-select the only show
    const selectedShow = shows[0]
    const encryptedKey = encrypt(api_key)
    const { data, error: dbError } = await supabase!
      .from('distribution_connections')
      .upsert(
        {
          show_id: showId,
          provider: 'transistor',
          external_show_id: selectedShow.id,
          external_show_name: selectedShow.name,
          encrypted_api_key: encryptedKey,
        },
        { onConflict: 'show_id,provider' }
      )
      .select('id, provider, external_show_id, external_show_name, created_at')
      .single()

    if (dbError) return errorResponse(dbError.message, 500)

    return jsonResponse(data, 201)
  }

  // Multiple shows — return them for the UI to present a picker
  return jsonResponse({ needs_selection: true, shows })
}

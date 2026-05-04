import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'

export async function POST(request: Request) {
  const { supabase, user, error } = await getAuthenticatedClient()
  if (error) return error

  const body = await request.json()
  if (!body.client_id) return errorResponse('client_id is required')

  const { data: client, error: fetchError } = await supabase!
    .from('clients')
    .select('id, user_id')
    .eq('id', body.client_id)
    .single()

  if (fetchError || !client) return errorResponse('Client not found', 404)
  if (client.user_id !== user!.id) return errorResponse('Forbidden', 403)

  const invite_code = crypto.randomUUID()

  const { data, error: updateError } = await supabase!
    .from('clients')
    .update({ invite_code, invite_sent_at: new Date().toISOString() })
    .eq('id', body.client_id)
    .select()
    .single()

  if (updateError) return errorResponse(updateError.message, 500)

  return jsonResponse({ invite_url: `/invite/${invite_code}`, invite_code, client: data }, 201)
}

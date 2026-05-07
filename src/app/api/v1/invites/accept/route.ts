import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'

function getAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function POST(request: Request) {
  const { user, error } = await getAuthenticatedClient()
  if (error) return error

  const body = await request.json()
  if (!body.invite_code) return errorResponse('invite_code is required')

  const admin = getAdminClient()

  const { data: client, error: fetchError } = await admin
    .from('clients')
    .select('*')
    .eq('invite_code', body.invite_code)
    .single()

  if (fetchError || !client) return errorResponse('Invalid invite code', 404)

  if (client.client_user_id && client.client_user_id !== user!.id) {
    return errorResponse('This invite has already been claimed', 409)
  }

  const updates: Record<string, unknown> = { client_user_id: user!.id }
  if (!client.onboarded_at) {
    updates.onboarded_at = new Date().toISOString()
  }

  const { data, error: updateError } = await admin
    .from('clients')
    .update(updates)
    .eq('id', client.id)
    .select()
    .single()

  if (updateError) return errorResponse(updateError.message, 500)

  return jsonResponse(data)
}

import { NextRequest } from 'next/server'
import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'

export async function GET() {
  const { supabase, user, error } = await getAuthenticatedClient()
  if (error) return error

  const { data, error: dbError } = await supabase!
    .from('user_integrations')
    .select('id, provider, account_id, account_name, account_email, account_avatar_url, created_at')
    .eq('user_id', user!.id)

  if (dbError) return errorResponse(dbError.message, 500)
  return jsonResponse(data)
}

export async function DELETE(request: NextRequest) {
  const { supabase, user, error } = await getAuthenticatedClient()
  if (error) return error

  const provider = request.nextUrl.searchParams.get('provider')
  if (!provider) return errorResponse('provider query param is required')

  const { error: dbError } = await supabase!
    .from('user_integrations')
    .delete()
    .eq('user_id', user!.id)
    .eq('provider', provider)

  if (dbError) return errorResponse(dbError.message, 500)
  return new Response(null, { status: 204 })
}

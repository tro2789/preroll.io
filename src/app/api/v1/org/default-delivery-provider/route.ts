import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'
import { createServiceClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/org/roles'

export async function GET() {
  const { org, error } = await getAuthenticatedClient()
  if (error) return error

  return jsonResponse({ provider: org!.defaultDeliveryProvider })
}

export async function PUT(request: Request) {
  const { org, error } = await getAuthenticatedClient()
  if (error) return error

  const roleError = requireRole(org!, 'admin')
  if (roleError) return roleError

  const body = await request.json()
  const provider = body.provider || null

  const supabase = createServiceClient()
  const { error: dbError } = await supabase
    .from('organizations')
    .update({ default_delivery_provider: provider })
    .eq('id', org!.id)

  if (dbError) return errorResponse(dbError.message, 500)

  return jsonResponse({ provider })
}

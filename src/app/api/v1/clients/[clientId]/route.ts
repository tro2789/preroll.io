import { NextRequest } from 'next/server'
import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'
import { requireRole } from '@/lib/org/roles'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params
  const { supabase, org, error } = await getAuthenticatedClient()
  if (error) return error

  const { data, error: dbError } = await supabase!
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .eq('org_id', org!.id)
    .single()

  if (dbError) return errorResponse('Client not found', 404)
  return jsonResponse(data)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params
  const { supabase, org, error } = await getAuthenticatedClient()
  if (error) return error

  const body = await request.json()
  const allowedFields = ['name', 'company', 'email', 'phone', 'notes', 'service_terms']
  const updateData: Record<string, unknown> = {}
  for (const field of allowedFields) {
    if (field in body) updateData[field] = body[field]
  }

  if (Object.keys(updateData).length === 0) return errorResponse('No valid fields to update')

  const { data, error: dbError } = await supabase!
    .from('clients')
    .update(updateData)
    .eq('id', clientId)
    .eq('org_id', org!.id)
    .select()
    .single()

  if (dbError) return errorResponse(dbError.message, 500)
  return jsonResponse(data)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params
  const { supabase, org, error } = await getAuthenticatedClient()
  if (error) return error

  const roleError = requireRole(org!, 'admin')
  if (roleError) return roleError

  const { error: dbError } = await supabase!
    .from('clients')
    .delete()
    .eq('id', clientId)
    .eq('org_id', org!.id)

  if (dbError) return errorResponse(dbError.message, 500)
  return new Response(null, { status: 204 })
}

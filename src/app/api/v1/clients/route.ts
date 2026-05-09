import { NextResponse } from 'next/server'
import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'
import { getOrgEntitlements } from '@/lib/entitlements'
import { requireRole } from '@/lib/org/roles'

export async function GET() {
  const { supabase, org, error } = await getAuthenticatedClient()
  if (error) return error

  const { data, error: dbError, count } = await supabase!
    .from('clients')
    .select('*', { count: 'exact' })
    .eq('org_id', org!.id)
    .order('name')

  if (dbError) return errorResponse(dbError.message, 500)
  return NextResponse.json({ data, count })
}

export async function POST(request: Request) {
  const { supabase, user, org, error } = await getAuthenticatedClient()
  if (error) return error

  const roleError = requireRole(org!, 'admin')
  if (roleError) return roleError

  const entitlements = await getOrgEntitlements(org!.id, org!.planId, org!.trialEndsAt)
  const max = entitlements.limit('max_clients')
  if (max !== null) {
    const { count } = await supabase!.from('clients').select('id', { count: 'exact', head: true }).eq('org_id', org!.id)
    if ((count ?? 0) >= max) {
      return errorResponse(`Your plan allows ${max} client. Upgrade to Pro for unlimited clients.`, 403)
    }
  }

  const body = await request.json()
  if (!body.name) return errorResponse('name is required')

  const { data, error: dbError } = await supabase!
    .from('clients')
    .insert({
      user_id: user!.id,
      org_id: org!.id,
      name: body.name,
      company: body.company || null,
      email: body.email || null,
      phone: body.phone || null,
      notes: body.notes || null,
      service_terms: body.service_terms || null,
    })
    .select()
    .single()

  if (dbError) return errorResponse(dbError.message, 500)
  return jsonResponse(data, 201)
}

import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'
import { createServiceClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/org/roles'
import { resolveImageUrl } from '@/lib/r2/client'
import { setOrgCookie, clearOrgCookie } from '@/lib/constants/plans'

export async function GET() {
  const { org, error } = await getAuthenticatedClient()
  if (error) return error

  const service = createServiceClient()
  const { data } = await service
    .from('organizations')
    .select('id, name, slug, logo_url')
    .eq('id', org!.id)
    .single()

  if (!data) return errorResponse('Organization not found', 404)

  return jsonResponse({
    id: data.id,
    name: data.name,
    slug: data.slug,
    logo_url: resolveImageUrl(data.logo_url) || null,
    role: org!.role,
  })
}

export async function PATCH(request: Request) {
  const { org, error } = await getAuthenticatedClient()
  if (error) return error

  const roleError = requireRole(org!, 'owner')
  if (roleError) return roleError

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid JSON body')
  }

  const updates: Record<string, unknown> = {}

  if (typeof body.name === 'string') {
    const name = (body.name as string).trim()
    if (!name) return errorResponse('Workspace name cannot be empty')
    if (name.length > 100) return errorResponse('Workspace name too long (max 100 characters)')
    updates.name = name
  }

  if (typeof body.logo_url === 'string') {
    updates.logo_url = body.logo_url || null
  }

  if (Object.keys(updates).length === 0) {
    return errorResponse('No valid fields to update')
  }

  const service = createServiceClient()
  const { data, error: updateError } = await service
    .from('organizations')
    .update(updates)
    .eq('id', org!.id)
    .select('id, name, slug, logo_url')
    .single()

  if (updateError) return errorResponse(updateError.message, 500)

  return jsonResponse({
    id: data.id,
    name: data.name,
    slug: data.slug,
    logo_url: resolveImageUrl(data.logo_url) || null,
  })
}

export async function DELETE(request: Request) {
  const { user, org, error } = await getAuthenticatedClient()
  if (error) return error

  const roleError = requireRole(org!, 'owner')
  if (roleError) return roleError

  const body = await request.json().catch(() => ({}))
  const confirmName = body.confirmName?.trim()
  if (!confirmName) return errorResponse('Confirmation name is required')

  const service = createServiceClient()

  const { data: orgRecord } = await service
    .from('organizations')
    .select('id, name')
    .eq('id', org!.id)
    .single()

  if (!orgRecord) return errorResponse('Organization not found', 404)
  if (confirmName !== orgRecord.name) return errorResponse('Confirmation name does not match', 400)

  const [{ count: memberCount }, { count: clientCount }] = await Promise.all([
    service
      .from('memberships')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', org!.id)
      .neq('user_id', user!.id),
    service
      .from('clients')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', org!.id),
  ])

  if ((memberCount ?? 0) > 0) return errorResponse('Organization still has other members. Remove them first.', 409)
  if ((clientCount ?? 0) > 0) return errorResponse('Organization still has clients. Delete all clients first.', 409)

  const { error: deleteError } = await service
    .from('organizations')
    .delete()
    .eq('id', org!.id)

  if (deleteError) return errorResponse(deleteError.message, 500)

  const { data: remaining } = await service
    .from('memberships')
    .select('org_id')
    .eq('user_id', user!.id)
    .limit(1)

  const nextOrgId = remaining?.[0]?.org_id ?? null

  if (nextOrgId) {
    await setOrgCookie(nextOrgId)
  } else {
    await clearOrgCookie()
  }

  return jsonResponse({ deleted: true, nextOrgId })
}

import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'
import { createServiceClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/org/roles'
import { resolveImageUrl } from '@/lib/r2/client'

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

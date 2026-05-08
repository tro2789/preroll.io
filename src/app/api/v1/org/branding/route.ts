import { NextRequest } from 'next/server'
import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'
import { requireRole } from '@/lib/org/roles'
import { getOrgEntitlements } from '@/lib/entitlements'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const { org, error } = await getAuthenticatedClient()
  if (error) return error

  const supabase = createServiceClient()

  const [{ data, error: dbError }, entitlements] = await Promise.all([
    supabase
      .from('organizations')
      .select('display_name, logo_url, accent_color')
      .eq('id', org!.id)
      .single(),
    getOrgEntitlements(org!.id),
  ])

  if (dbError) return errorResponse(dbError.message, 500)
  return jsonResponse({ ...data, entitled: entitlements.can('white_label') })
}

export async function PATCH(request: NextRequest) {
  const { org, error } = await getAuthenticatedClient()
  if (error) return error

  const roleError = requireRole(org!, 'owner')
  if (roleError) return roleError

  const entitlements = await getOrgEntitlements(org!.id)
  if (!entitlements.can('white_label')) {
    return errorResponse('White-label branding requires Studio plan or higher.', 403)
  }

  const body = await request.json()
  const update: Record<string, string | null> = {}

  if ('display_name' in body) update.display_name = body.display_name || null
  if ('logo_url' in body) update.logo_url = body.logo_url || null
  if ('accent_color' in body) {
    const color = body.accent_color
    if (color && !/^#[0-9a-fA-F]{3,8}$/.test(color)) {
      return errorResponse('accent_color must be a valid hex color (e.g. #7c3aed)')
    }
    update.accent_color = color || null
  }

  if (Object.keys(update).length === 0) {
    return errorResponse('No valid fields to update')
  }

  const supabase = createServiceClient()

  const { data, error: dbError } = await supabase
    .from('organizations')
    .update(update)
    .eq('id', org!.id)
    .select('display_name, logo_url, accent_color')
    .single()

  if (dbError) return errorResponse(dbError.message, 500)
  return jsonResponse(data)
}

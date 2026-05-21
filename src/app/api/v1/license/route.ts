import { NextRequest } from 'next/server'
import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'
import { createServiceClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/org/roles'
import { isSelfHosted } from '@/lib/entitlements'
import { generateLicenseKey, validateLicenseKey, type LicenseInfo } from '@/lib/license'

export async function GET() {
  const { org, error } = await getAuthenticatedClient()
  if (error) return error

  const selfHosted = isSelfHosted()

  if (!selfHosted) {
    return jsonResponse({ self_hosted: false, registered: false, info: null })
  }

  const supabase = createServiceClient()
  const { data: orgData } = await supabase
    .from('organizations')
    .select('license_key')
    .eq('id', org!.id)
    .single()

  if (!orgData?.license_key) {
    return jsonResponse({ self_hosted: true, registered: false, info: null })
  }

  let info: LicenseInfo | null = null
  try {
    info = validateLicenseKey(orgData.license_key)
  } catch {
    // Signing key not configured — treat as unregistered
  }
  return jsonResponse({
    self_hosted: true,
    registered: info !== null,
    info,
  })
}

export async function POST(request: NextRequest) {
  if (!isSelfHosted()) {
    return errorResponse('Not found', 404)
  }

  const { org, error } = await getAuthenticatedClient()
  if (error) return error

  const roleError = requireRole(org!, 'owner')
  if (roleError) return roleError

  const body = await request.json()
  if (!body.email?.trim()) return errorResponse('email is required')
  if (!body.org_name?.trim()) return errorResponse('org_name is required')

  const info: LicenseInfo = {
    email: body.email.trim(),
    orgName: body.org_name.trim(),
    issuedAt: new Date().toISOString(),
  }

  let key: string
  try {
    key = generateLicenseKey(info)
  } catch {
    return errorResponse('License signing key is not configured', 500)
  }

  const supabase = createServiceClient()
  const { error: dbError } = await supabase
    .from('organizations')
    .update({ license_key: key })
    .eq('id', org!.id)

  if (dbError) return errorResponse(dbError.message, 500)

  return jsonResponse({ key, info }, 201)
}

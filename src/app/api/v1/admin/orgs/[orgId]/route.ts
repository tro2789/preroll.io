import { NextRequest } from 'next/server'
import { getAdminClient } from '@/lib/admin/api-auth'
import { jsonResponse, errorResponse } from '@/lib/api/helpers'
import { VALID_PLANS } from '@/lib/constants/plans'
const VALID_PLAN_STATUSES = ['active', 'past_due', 'canceled', 'incomplete']

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const { service, error } = await getAdminClient()
  if (error) return error

  const { orgId } = await params

  const { data, error: fetchError } = await service!
    .from('organizations')
    .select('*')
    .eq('id', orgId)
    .single()

  if (fetchError || !data) return errorResponse('Organization not found', 404)

  return jsonResponse(data)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const { service, error } = await getAdminClient()
  if (error) return error

  const { orgId } = await params

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid JSON body')
  }

  const updates: Record<string, unknown> = {}

  if (body.plan_id !== undefined) {
    if (!VALID_PLANS.includes(body.plan_id as string)) {
      return errorResponse(`Invalid plan_id. Must be one of: ${VALID_PLANS.join(', ')}`)
    }
    updates.plan_id = body.plan_id
  }

  if (body.plan_status !== undefined) {
    if (!VALID_PLAN_STATUSES.includes(body.plan_status as string)) {
      return errorResponse(`Invalid plan_status. Must be one of: ${VALID_PLAN_STATUSES.join(', ')}`)
    }
    updates.plan_status = body.plan_status
  }

  if (body.trial_ends_at !== undefined) {
    if (body.trial_ends_at !== null && typeof body.trial_ends_at !== 'string') {
      return errorResponse('trial_ends_at must be a string (ISO date) or null')
    }
    updates.trial_ends_at = body.trial_ends_at
  }

  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || !body.name.trim()) {
      return errorResponse('name must be a non-empty string')
    }
    updates.name = body.name.trim()
  }

  if (body.storage_addon_tbs !== undefined) {
    if (typeof body.storage_addon_tbs !== 'number' || body.storage_addon_tbs < 0) {
      return errorResponse('storage_addon_tbs must be a non-negative number')
    }
    updates.storage_addon_tbs = body.storage_addon_tbs
  }

  if (body.storage_grace_started_at !== undefined) {
    if (body.storage_grace_started_at !== null && typeof body.storage_grace_started_at !== 'string') {
      return errorResponse('storage_grace_started_at must be a string (ISO date) or null')
    }
    updates.storage_grace_started_at = body.storage_grace_started_at
  }

  if (Object.keys(updates).length === 0) {
    return errorResponse('No valid fields to update')
  }

  const { data, error: updateError } = await service!
    .from('organizations')
    .update(updates)
    .eq('id', orgId)
    .select()
    .single()

  if (updateError) return errorResponse(updateError.message, 500)

  return jsonResponse(data)
}

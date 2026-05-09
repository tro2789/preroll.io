import { cookies } from 'next/headers'
import { jsonResponse, errorResponse } from '@/lib/api/helpers'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { ORG_COOKIE_NAME } from '@/lib/constants/plans'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return errorResponse('Unauthorized', 401)

  const body = await request.json()
  const orgId = body.orgId?.trim()
  if (!orgId) return errorResponse('orgId is required')

  const service = createServiceClient()
  const { data: membership } = await service
    .from('memberships')
    .select('org_id, role')
    .eq('user_id', user.id)
    .eq('org_id', orgId)
    .single()

  if (!membership) return errorResponse('You are not a member of this organization', 403)

  const cookieStore = await cookies()
  cookieStore.set(ORG_COOKIE_NAME, orgId, {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
  })

  return jsonResponse({ orgId, role: membership.role })
}

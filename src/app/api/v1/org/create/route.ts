import { jsonResponse, errorResponse } from '@/lib/api/helpers'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { setOrgCookie } from '@/lib/org/cookie'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return errorResponse('Unauthorized', 401)

  const body = await request.json().catch(() => ({}))
  const name = body.name?.trim()
  if (!name) return errorResponse('Organization name is required')
  if (name.length > 100) return errorResponse('Organization name too long (max 100 characters)')

  const service = createServiceClient()

  const { data: ownedOrgs } = await service
    .from('memberships')
    .select('org_id, organizations(plan_id)')
    .eq('user_id', user.id)
    .eq('role', 'owner')

  const ownedCount = ownedOrgs?.length ?? 0
  const hasPaidOrg = ownedOrgs?.some((m) => {
    const org = m.organizations as unknown as { plan_id: string } | null
    return org?.plan_id === 'pro' || org?.plan_id === 'studio'
  })

  if (ownedCount >= 1 && !hasPaidOrg) {
    return errorResponse('Free plan is limited to 1 organization. Upgrade to create more.', 403)
  }

  const isFirstOrg = ownedCount === 0
  const slug = crypto.randomUUID().replace(/-/g, '')

  const { data: org, error: orgError } = await service
    .from('organizations')
    .insert({
      name,
      slug,
      trial_ends_at: isFirstOrg
        ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        : null,
    })
    .select('id, name, slug, plan_id')
    .single()

  if (orgError) return errorResponse(orgError.message, 500)

  const { error: memError } = await service
    .from('memberships')
    .insert({ org_id: org.id, user_id: user.id, role: 'owner' })

  if (memError) return errorResponse(memError.message, 500)

  await setOrgCookie(org.id)

  return jsonResponse(org, 201)
}

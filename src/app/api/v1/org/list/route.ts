import { jsonResponse, errorResponse } from '@/lib/api/helpers'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return errorResponse('Unauthorized', 401)

  const service = createServiceClient()
  const { data: memberships } = await service
    .from('memberships')
    .select('org_id, role, organizations(id, name, slug, plan_id, trial_ends_at)')
    .eq('user_id', user.id)

  if (!memberships || memberships.length === 0) {
    return jsonResponse([])
  }

  const orgs = memberships.map((m) => {
    const org = m.organizations as unknown as {
      id: string; name: string; slug: string; plan_id: string; trial_ends_at: string | null
    }
    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      planId: org.plan_id,
      trialEndsAt: org.trial_ends_at,
      role: m.role,
    }
  })

  return jsonResponse(orgs)
}

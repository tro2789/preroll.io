import { jsonResponse, errorResponse } from '@/lib/api/helpers'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { setOrgCookie } from '@/lib/constants/plans'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return errorResponse('Unauthorized', 401)

  const body = await request.json().catch(() => ({}))
  const name = body.name?.trim()
  if (!name) return errorResponse('Organization name is required')
  if (name.length > 100) return errorResponse('Organization name too long (max 100 characters)')
  const slug = crypto.randomUUID().replace(/-/g, '')

  const service = createServiceClient()

  const { data: org, error: orgError } = await service
    .from('organizations')
    .insert({
      name,
      slug,
      trial_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
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

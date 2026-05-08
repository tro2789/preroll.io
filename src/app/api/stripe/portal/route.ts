import { getAuthenticatedClient, errorResponse, jsonResponse } from '@/lib/api/helpers'
import { createServiceClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe/client'
import { isSelfHosted } from '@/lib/entitlements'
import { requireRole } from '@/lib/org/roles'

export async function POST(request: Request) {
  if (isSelfHosted()) return errorResponse('Not found', 404)

  const { org, error } = await getAuthenticatedClient()
  if (error) return error

  const roleError = requireRole(org!, 'owner')
  if (roleError) return roleError

  const supabase = createServiceClient()

  const { data: orgRecord } = await supabase
    .from('organizations')
    .select('stripe_customer_id')
    .eq('id', org!.id)
    .single()

  if (!orgRecord?.stripe_customer_id) {
    return errorResponse('No billing account found. Subscribe to a plan first.', 400)
  }

  const stripe = getStripe()
  const origin = request.headers.get('origin') || ''

  const session = await stripe.billingPortal.sessions.create({
    customer: orgRecord.stripe_customer_id,
    return_url: `${origin}/app/settings/billing`,
  })

  return jsonResponse({ url: session.url })
}

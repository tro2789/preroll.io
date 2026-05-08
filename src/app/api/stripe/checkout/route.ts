import { getAuthenticatedClient, errorResponse, jsonResponse } from '@/lib/api/helpers'
import { createServiceClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe/client'
import { isSelfHosted } from '@/lib/entitlements'
import { requireRole } from '@/lib/org/roles'

function getPriceId(plan: string, interval: string): string | undefined {
  const ids: Record<string, Record<string, string | undefined>> = {
    pro: {
      month: process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
      year: process.env.STRIPE_PRO_ANNUAL_PRICE_ID,
    },
    studio: {
      month: process.env.STRIPE_STUDIO_MONTHLY_PRICE_ID,
      year: process.env.STRIPE_STUDIO_ANNUAL_PRICE_ID,
    },
  }
  return ids[plan]?.[interval]
}

export async function POST(request: Request) {
  if (isSelfHosted()) return errorResponse('Not found', 404)

  const { user, org, error } = await getAuthenticatedClient()
  if (error) return error

  const roleError = requireRole(org!, 'owner')
  if (roleError) return roleError

  const body = await request.json()
  const { plan, interval = 'month' } = body as { plan?: string; interval?: string }

  if (!plan || !['pro', 'studio'].includes(plan)) return errorResponse('Invalid plan')
  if (!['month', 'year'].includes(interval)) return errorResponse('Invalid interval')

  const priceId = getPriceId(plan, interval)
  if (!priceId) return errorResponse('Price not configured', 500)
  const stripe = getStripe()

  const supabase = createServiceClient()

  const { data: orgRecord } = await supabase
    .from('organizations')
    .select('stripe_customer_id')
    .eq('id', org!.id)
    .single()

  const origin = request.headers.get('origin') || ''

  const sessionParams: Parameters<typeof stripe.checkout.sessions.create>[0] = {
    mode: 'subscription',
    client_reference_id: org!.id,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/app/settings/billing?success=true`,
    cancel_url: `${origin}/app/settings/billing?canceled=true`,
    allow_promotion_codes: true,
  }

  if (orgRecord?.stripe_customer_id) {
    sessionParams.customer = orgRecord.stripe_customer_id
  } else {
    sessionParams.customer_email = user!.email
  }

  const session = await stripe.checkout.sessions.create(sessionParams)

  return jsonResponse({ url: session.url })
}

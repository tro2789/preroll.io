import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'
import { createServiceClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe/client'
import { isSelfHosted } from '@/lib/entitlements'
import { requireRole } from '@/lib/org/roles'
import { syncGracePeriod } from '@/lib/storage/usage'

export async function POST(request: Request) {
  if (isSelfHosted()) return errorResponse('Not available in self-hosted mode', 404)

  const { org, error } = await getAuthenticatedClient()
  if (error) return error

  const roleError = requireRole(org!, 'owner')
  if (roleError) return roleError

  if (!['pro', 'studio'].includes(org!.planId)) {
    return errorResponse('Storage add-ons require a Pro or Studio plan.', 403)
  }

  const body = await request.json()
  const { quantity } = body as { quantity?: number }

  if (quantity === undefined || !Number.isInteger(quantity) || quantity < 0) {
    return errorResponse('quantity must be a non-negative integer')
  }

  const priceId = process.env.STRIPE_STORAGE_ADDON_PRICE_ID
  if (!priceId) return errorResponse('Storage add-on pricing not configured', 500)

  const supabase = createServiceClient()
  const stripe = getStripe()

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('stripe_subscription_id')
    .eq('org_id', org!.id)
    .single()

  if (!sub?.stripe_subscription_id) {
    return errorResponse('No active subscription found. Subscribe to a plan first.', 400)
  }

  const subscription = await stripe.subscriptions.retrieve(sub.stripe_subscription_id)

  const storageItem = subscription.items.data.find(
    (item) => item.price.id === priceId
  )

  if (quantity === 0 && storageItem) {
    await stripe.subscriptionItems.del(storageItem.id, { proration_behavior: 'create_prorations' })
  } else if (quantity === 0 && !storageItem) {
    // Nothing to do
  } else if (storageItem) {
    await stripe.subscriptionItems.update(storageItem.id, {
      quantity,
      proration_behavior: 'create_prorations',
    })
  } else {
    await stripe.subscriptionItems.create({
      subscription: sub.stripe_subscription_id,
      price: priceId,
      quantity,
      proration_behavior: 'create_prorations',
    })
  }

  await supabase
    .from('organizations')
    .update({ storage_addon_tbs: quantity })
    .eq('id', org!.id)

  await syncGracePeriod(org!.id, org!.planId, org!.trialEndsAt)

  return jsonResponse({ storage_addon_tbs: quantity })
}

export async function GET() {
  const { org, error } = await getAuthenticatedClient()
  if (error) return error

  const supabase = createServiceClient()
  const { data: orgData } = await supabase
    .from('organizations')
    .select('storage_addon_tbs')
    .eq('id', org!.id)
    .single()

  return jsonResponse({ storage_addon_tbs: orgData?.storage_addon_tbs ?? 0 })
}

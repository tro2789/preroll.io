import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe/client'
import { isSelfHosted } from '@/lib/entitlements'
import { syncGracePeriod } from '@/lib/storage/usage'

async function ensureAiAddon(supabase: ReturnType<typeof createServiceClient>, orgId: string) {
  const { data: existing } = await supabase
    .from('ai_addon')
    .select('id')
    .eq('org_id', orgId)
    .single()

  if (!existing) {
    await supabase
      .from('ai_addon')
      .insert({
        org_id: orgId,
        enabled: true,
        credits_balance: 0,
        monthly_credits_used: 0,
        cycle_reset_at: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString(),
      })
  }
}

function planFromPriceId(priceId: string): string {
  const map: Record<string, string> = {
    [process.env.STRIPE_PRO_MONTHLY_PRICE_ID || '']: 'pro',
    [process.env.STRIPE_PRO_ANNUAL_PRICE_ID || '']: 'pro',
    [process.env.STRIPE_STUDIO_MONTHLY_PRICE_ID || '']: 'studio',
    [process.env.STRIPE_STUDIO_ANNUAL_PRICE_ID || '']: 'studio',
  }
  return map[priceId] || 'free'
}

function storageAddonTbs(items: { price: { id: string }; quantity?: number | null }[]): number {
  const addonPriceId = process.env.STRIPE_STORAGE_ADDON_PRICE_ID
  if (!addonPriceId) return 0
  const item = items.find((i) => i.price.id === addonPriceId)
  return item?.quantity ?? 0
}

export async function POST(request: Request) {
  if (isSelfHosted()) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const stripe = getStripe()
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  let event
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { error: dupeError } = await supabase
    .from('stripe_events')
    .insert({ id: event.id, type: event.type, processed_at: new Date().toISOString() })

  if (dupeError) {
    return NextResponse.json({ received: true })
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object
      const orgId = session.client_reference_id
      if (!orgId) break

      const customerId = session.customer as string
      await supabase
        .from('organizations')
        .update({ stripe_customer_id: customerId })
        .eq('id', orgId)

      if (session.metadata?.type === 'ai_credits') {
        const credits = parseInt(session.metadata.credits || '0')
        if (credits > 0) {
          const paymentIntentId = session.payment_intent as string

          await ensureAiAddon(supabase, orgId)

          await supabase.rpc('refund_ai_credits', {
            p_org_id: orgId,
            p_amount: credits,
            p_reason: 'credit_purchase',
            p_reference_id: orgId,
          })

          await supabase.from('ai_credit_purchases').insert({
            org_id: orgId,
            stripe_payment_intent_id: paymentIntentId,
            credits_purchased: credits,
            amount_cents: session.amount_total || 0,
          })
        }
        break
      }

      const subscriptionId = session.subscription as string
      if (subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId)
        const item = subscription.items.data[0]
        const priceId = item?.price.id
        const planId = planFromPriceId(priceId)

        await supabase.from('subscriptions').upsert({
          org_id: orgId,
          stripe_subscription_id: subscriptionId,
          stripe_price_id: priceId,
          status: subscription.status,
          current_period_start: new Date(item.current_period_start * 1000).toISOString(),
          current_period_end: new Date(item.current_period_end * 1000).toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'stripe_subscription_id' })

        const addonTbs = storageAddonTbs(subscription.items.data)
        await supabase
          .from('organizations')
          .update({ plan_id: planId, plan_status: subscription.status, storage_addon_tbs: addonTbs })
          .eq('id', orgId)

        if (planId === 'pro' || planId === 'studio') {
          await ensureAiAddon(supabase, orgId)
        }

        await syncGracePeriod(orgId).catch(() => {})
      }
      break
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object
      const item = subscription.items.data[0]
      const priceId = item?.price.id

      const { data: sub } = await supabase
        .from('subscriptions')
        .select('org_id')
        .eq('stripe_subscription_id', subscription.id)
        .single()

      if (!sub) break

      await supabase
        .from('subscriptions')
        .update({
          stripe_price_id: priceId,
          status: subscription.status,
          current_period_start: new Date(item.current_period_start * 1000).toISOString(),
          current_period_end: new Date(item.current_period_end * 1000).toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end,
          canceled_at: subscription.canceled_at
            ? new Date(subscription.canceled_at * 1000).toISOString()
            : null,
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_subscription_id', subscription.id)

      const planId = planFromPriceId(priceId)
      const addonTbs = storageAddonTbs(subscription.items.data)
      await supabase
        .from('organizations')
        .update({ plan_id: planId, plan_status: subscription.status, storage_addon_tbs: addonTbs })
        .eq('id', sub.org_id)

      if (planId === 'pro' || planId === 'studio') {
        await ensureAiAddon(supabase, sub.org_id)
      }

      await syncGracePeriod(sub.org_id).catch(() => {})

      break
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object

      const { data: sub } = await supabase
        .from('subscriptions')
        .select('org_id')
        .eq('stripe_subscription_id', subscription.id)
        .single()

      if (!sub) break

      await supabase
        .from('subscriptions')
        .update({
          status: subscription.status,
          canceled_at: subscription.canceled_at
            ? new Date(subscription.canceled_at * 1000).toISOString()
            : new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_subscription_id', subscription.id)

      await supabase
        .from('organizations')
        .update({ plan_id: 'free', plan_status: 'canceled', storage_addon_tbs: 0 })
        .eq('id', sub.org_id)

      await syncGracePeriod(sub.org_id).catch(() => {})

      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object
      const customerId = invoice.customer as string

      await supabase
        .from('organizations')
        .update({ plan_status: 'past_due' })
        .eq('stripe_customer_id', customerId)

      break
    }
  }

  return NextResponse.json({ received: true })
}

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe/client'
import { isSelfHosted } from '@/lib/entitlements'

function planFromPriceId(priceId: string): string {
  const map: Record<string, string> = {
    [process.env.STRIPE_PRO_MONTHLY_PRICE_ID || '']: 'pro',
    [process.env.STRIPE_PRO_ANNUAL_PRICE_ID || '']: 'pro',
    [process.env.STRIPE_STUDIO_MONTHLY_PRICE_ID || '']: 'studio',
    [process.env.STRIPE_STUDIO_ANNUAL_PRICE_ID || '']: 'studio',
  }
  return map[priceId] || 'free'
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

        await supabase
          .from('organizations')
          .update({ plan_id: planId, plan_status: subscription.status })
          .eq('id', orgId)
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
      await supabase
        .from('organizations')
        .update({ plan_id: planId, plan_status: subscription.status })
        .eq('id', sub.org_id)

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
        .update({ plan_id: 'free', plan_status: 'canceled' })
        .eq('id', sub.org_id)

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

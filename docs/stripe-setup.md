# Stripe Setup for PreRoll

## 1. Create Stripe Products & Prices

Create these in [Stripe Dashboard > Products](https://dashboard.stripe.com/products):

### Product: PreRoll Pro
- **Name:** PreRoll Pro
- **Description:** Unlimited clients and shows, all integrations, webhooks, API keys, MCP server, episode templates.
- **Price 1 (Monthly):** $29/month, recurring
- **Price 2 (Annual):** $289/year, recurring (~17% discount)

### Product: PreRoll Studio
- **Name:** PreRoll Studio
- **Description:** Everything in Pro plus multi-user access, white-label portal, reporting, priority support.
- **Price 1 (Monthly):** $79/month, recurring
- **Price 2 (Annual):** $789/year, recurring (~17% discount)

> Free tier has no Stripe product — it's the default for all new signups.

## 2. Configure Stripe Customer Portal

Go to [Stripe Dashboard > Settings > Customer Portal](https://dashboard.stripe.com/settings/billing/portal):

- Enable **invoice history**
- Enable **subscription cancellation** (cancel at end of period)
- Enable **subscription switching** (upgrade/downgrade between Pro and Studio)
- Enable **promotion codes** if you want to offer discounts
- Set return URL to: `https://preroll.io/app/settings/billing`

## 3. Create Webhook Endpoint

Go to [Stripe Dashboard > Developers > Webhooks](https://dashboard.stripe.com/webhooks):

- **Endpoint URL:** `https://preroll.io/api/stripe/webhook`
- **Events to send:**
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`

Copy the **Signing Secret** (starts with `whsec_`).

## 4. Environment Variables

After creating the products and webhook, collect the IDs and set these env vars in Vercel (or `.env.local` for dev):

```
# Stripe keys (from Dashboard > Developers > API Keys)
STRIPE_SECRET_KEY=sk_live_...        # or sk_test_... for dev
STRIPE_WEBHOOK_SECRET=whsec_...      # from webhook endpoint above

# Price IDs (from each product's price section, starts with price_)
STRIPE_PRO_MONTHLY_PRICE_ID=price_...
STRIPE_PRO_ANNUAL_PRICE_ID=price_...
STRIPE_STUDIO_MONTHLY_PRICE_ID=price_...
STRIPE_STUDIO_ANNUAL_PRICE_ID=price_...

# Self-hosted mode (only set for self-hosted deployments, omit for hosted)
# PREROLL_SELF_HOSTED=true
```

## 5. Test Mode Checklist

Use Stripe test mode first (`sk_test_` keys):

- [ ] Sign up a new user, confirm org was auto-created in Supabase
- [ ] Go to Settings > Billing, click Monthly under Pro
- [ ] Complete checkout with test card `4242 4242 4242 4242`
- [ ] Verify redirect back to `/app/settings/billing?success=true`
- [ ] Verify `organizations.plan_id` updated to `pro` in Supabase
- [ ] Verify `subscriptions` row created
- [ ] Click "Manage Subscription" and confirm portal loads
- [ ] Create a second client — should be allowed on Pro
- [ ] Cancel subscription in portal, verify plan reverts to `free`
- [ ] On free plan, try creating a webhook endpoint — should get 403
- [ ] Try connecting an integration — should get 403

## 6. Go Live

1. Switch all `sk_test_` / `whsec_test_` values to live keys in Vercel
2. Create a new webhook endpoint in Stripe live mode pointing to `https://preroll.io/api/stripe/webhook`
3. Update `STRIPE_WEBHOOK_SECRET` with the live signing secret
4. Create live-mode products/prices (or copy from test mode) and update the `STRIPE_*_PRICE_ID` vars

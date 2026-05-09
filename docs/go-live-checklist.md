# PreRoll Go-Live Checklist

Everything that needs manual setup, configuration, or testing before launching PreRoll as a paid product.

---

## 1. Stripe Setup

### Create Products & Prices

Go to [Stripe Dashboard > Products](https://dashboard.stripe.com/products) and create:

| Product | Monthly Price | Annual Price |
|---------|--------------|--------------|
| PreRoll Pro | $29/month | $289/year |
| PreRoll Studio | $79/month | $789/year |

Copy the **Price ID** (starts with `price_`) for each of the 4 prices.

### Configure Customer Portal

Go to [Stripe Dashboard > Settings > Customer Portal](https://dashboard.stripe.com/settings/billing/portal):

- Enable invoice history
- Enable subscription cancellation (cancel at end of period)
- Enable subscription switching (upgrade/downgrade between Pro and Studio)
- Enable promotion codes (optional)
- Set return URL: `https://preroll.io/app/settings/billing`

### Create Webhook Endpoint

Go to [Stripe Dashboard > Developers > Webhooks](https://dashboard.stripe.com/webhooks):

- **URL:** `https://preroll.io/api/stripe/webhook`
- **Events:**
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`

Copy the **Signing Secret** (starts with `whsec_`).

---

## 2. Environment Variables

Set these in Vercel (Settings > Environment Variables) for the production deployment:

```
# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_MONTHLY_PRICE_ID=price_...
STRIPE_PRO_ANNUAL_PRICE_ID=price_...
STRIPE_STUDIO_MONTHLY_PRICE_ID=price_...
STRIPE_STUDIO_ANNUAL_PRICE_ID=price_...
```

These should already be set (verify they're current):
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=preroll-assets
R2_PUBLIC_URL=...
INTEGRATION_ENCRYPTION_KEY=...
RESEND_API_KEY=...
```

**Do NOT set** `PREROLL_SELF_HOSTED` on the hosted deployment — it disables all billing.

---

## 3. Test in Stripe Test Mode First

**Dev environment status:** Test-mode Stripe is configured. Products, prices, and webhook endpoint are set up. Env vars are in `.env.local` and Vercel preview. Webhook destination: `we_1Stq1kC49HaM72BGjlsKLG1x` → `https://dev.preroll.io/api/stripe/webhook`.

### Trial Checklist

- [ ] Sign up a new user — confirm org auto-created with `trial_ends_at` = 7 days from now
- [ ] Go to Settings > Billing — see "Studio Trial — 7 days left" banner
- [ ] During trial: verify all features accessible (Integrations, Webhooks, API Keys, Team, Branding, Reports)
- [ ] Set `trial_ends_at` to a past date in Supabase — verify trial banner changes to "Your free trial has ended"
- [ ] After trial: verify upgrade gates appear on all gated settings pages and Reports

### Billing Flow Checklist

- [ ] Sign up a new user — confirm org auto-created in Supabase (`organizations` + `memberships` tables)
- [ ] Go to Settings > Billing — see Free plan (or trial), upgrade cards for Pro and Studio
- [ ] Click Monthly under Pro
- [ ] Complete checkout with test card `4242 4242 4242 4242` (any future expiry, any CVC)
- [ ] Verify redirect to `/app/settings/billing?success=true`
- [ ] Check Supabase: `organizations.plan_id` = `pro`, `subscriptions` row created
- [ ] Click "Manage Subscription" — verify Stripe Customer Portal loads
- [ ] In portal, cancel subscription — verify `plan_id` reverts to `free`

### Entitlements Checklist (test with trial expired)

- [ ] On **free plan**: create 1 client (should work), try creating a 2nd (should get 403)
- [ ] On **free plan**: create 1 show (should work), try creating a 2nd (should get 403)
- [ ] On **free plan**: Integrations page should show upgrade gate (not the connect buttons)
- [ ] On **free plan**: Webhooks page should show upgrade gate
- [ ] On **free plan**: API Keys page should show upgrade gate
- [ ] Upgrade to **Pro**: all of the above pages should show their normal UI
- [ ] On **Pro plan**: Team page invite section should show upgrade gate
- [ ] On **Pro plan**: Branding page should show upgrade gate
- [ ] On **Pro plan**: Reports page should show upgrade gate
- [ ] Upgrade to **Studio**: team invite, branding, and reports should all work

### Team / Multi-User Checklist

- [ ] On Studio plan, go to Settings > Team
- [ ] Invite a team member by email with "Member" role
- [ ] Check that the invite email arrives (or check `team_invites` table in Supabase)
- [ ] Accept the invite from a different browser/incognito using the magic link
- [ ] Verify the new user lands on `/team/join`, sees success, can access `/app`
- [ ] As the member: verify they can see all clients/shows/episodes
- [ ] As the member: verify they CANNOT create clients or shows (admin-only)
- [ ] As the member: verify they CAN create/edit episodes and deliverables
- [ ] As owner: remove the member from Settings > Team
- [ ] Verify the removed user can no longer access the app

### White-Label Branding Checklist

- [ ] On Studio plan, go to Settings > Branding
- [ ] Set a display name, logo URL, and accent color
- [ ] Open the client portal (from a client's perspective) — verify custom branding appears
- [ ] Verify the accent color overrides the default purple
- [ ] Clear branding (reset to defaults) — verify portal shows "PreRoll" again
- [ ] On a non-Studio plan, verify the branding page shows an upgrade prompt

### Reports Checklist

- [ ] Create some test data: a few clients, shows, episodes in various stages
- [ ] Go to Reports page — verify stat cards, by-show table, and by-month chart render
- [ ] Test period filter (30d / 90d / 12m / All)
- [ ] Test show filter dropdown

### Client Portal Checklist

- [ ] Send a client invite from a client detail page
- [ ] Accept the invite and verify portal access
- [ ] Check that the client can see their shows, episodes, deliverables
- [ ] Submit a deliverable for review, verify the client can approve/request revision
- [ ] Verify webhook fires on approval (if webhook endpoints configured)

### API Key / MCP Checklist

- [ ] Create an API key in Settings > API Keys
- [ ] Test a curl request: `curl -H "Authorization: Bearer pr_..." https://preroll.io/api/v1/clients`
- [ ] Verify it returns the org's data
- [ ] Test the MCP server with the API key

---

## 4. Go Live with Stripe

Once testing passes:

1. Switch all Stripe env vars from test to live keys in Vercel production
2. Create live-mode products/prices in Stripe (or copy from test mode)
3. Create a live-mode webhook endpoint: `https://preroll.io/api/stripe/webhook`
4. Update the 4 `STRIPE_*_PRICE_ID` vars with live price IDs
5. Update `STRIPE_WEBHOOK_SECRET` with the live signing secret
6. Redeploy on Vercel

---

## 5. DNS / Domain

Verify these are configured:
- `preroll.io` → Vercel production deployment
- Supabase custom domain (if using one) for auth redirects

---

## 6. Monitoring

After launch, watch for:
- Stripe webhook failures: [Dashboard > Developers > Webhooks > (endpoint) > Attempts](https://dashboard.stripe.com/webhooks)
- Supabase errors: check `stripe_events` table for processed events, `webhook_deliveries` for egress
- Vercel function errors: Vercel Dashboard > Logs

---

## 7. Optional: Self-Hosted Testing

If you want to verify the self-hosted experience:

1. Set `PREROLL_SELF_HOSTED=true` in `.env.local`
2. Start the dev server — all plan limits should be bypassed
3. Settings > License — register with email and org name
4. Verify license key is stored and displayed
5. Verify all features work without Stripe keys configured

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**PreRoll** is an API-first podcast production management platform for service providers. It's the orchestration layer for producers who manage multiple client shows — consolidating episode pipelines, client communication, asset organization, and publishing into one place.

**Domain:** preroll.io

## Product Philosophy

- **API-first:** The REST API is the product. The web UI, client portal, and MCP server are all consumers of the same API.
- **Orchestration layer, not a warehouse:** PreRoll organizes and tracks work across external tools (Frame.io, Transistor, Canva, etc.) rather than replacing them. Lightweight assets (branding, thumbnails, intros) are stored in R2; large files (video, raw audio) are referenced via links.
- **Dog-fooded:** Built for the developer's own podcast production business first, designed for other producers/agencies second.

## Architecture

```
┌─────────────────────────────────────────────┐
│  PreRoll API (REST + Webhooks)              │
│  api.preroll.io                             │
└──────┬──────────┬──────────┬────────────────┘
       │          │          │
  ┌────┴───┐ ┌───┴────┐ ┌───┴──────────┐
  │ Web UI │ │ Client │ │ MCP Server   │
  │(Next.js)│ │ Portal │ │ (local CLI)  │
  └────────┘ └────────┘ └──────────────┘
       │          │          │
  ┌────┴───┐ ┌───┴────┐ ┌───┴──────────┐
  │Frame.io│ │Transistor│ │ n8n /       │
  │(links) │ │(publish) │ │ Webhooks    │
  └────────┘ └─────────┘ └─────────────┘
```

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js (App Router) with TypeScript |
| Database + Auth | Supabase (Postgres + Auth + RLS + Realtime) |
| Storage | Cloudflare R2 (branding, thumbnails, intros, light assets) |
| Deployment | Vercel |
| Payments | Stripe (subscriptions, checkout, customer portal) |

## Environment Constraints

**Ports 3000-3002, 3005, 3010, 3020 are occupied** by Docker containers (n8n, Pingvin Share, Zipline, etc.). The dev server runs on **port 3003**.

**Dev server binds to 0.0.0.0** for LAN access. The dev machine is at `192.168.0.83`, accessed via SSH.

**Prefer HTTPS over SSH** for git pushes (SSH may be blocked in Claude Code's sandbox).

## Multi-Tenancy & Billing

All data is scoped to **organizations** (not individual users). Every user belongs to an org via the `memberships` table. Solo producers have a 1-person org auto-created at signup.

### Key concepts:
- **`organizations`** — workspace with `plan_id`, `stripe_customer_id`, billing state
- **`memberships`** — links users to orgs with roles (`owner`, `admin`, `member`)
- **`org_id`** — present on `clients`, `tags`, `user_integrations`, `file_references`, `webhook_endpoints`, `api_keys`
- **RLS** — all producer-side policies use `user_org_ids()` helper function, not `auth.uid()` directly
- **`plan_entitlements`** — database-driven feature flags per plan (free/pro/studio)
- **`PREROLL_SELF_HOSTED=true`** — env var that bypasses all plan checks

### Entitlements enforcement:
- API-layer enforcement via `getOrgEntitlements(orgId)` in `src/lib/entitlements.ts`
- Checked at resource-creation boundaries (POST /clients, /shows, /webhook-endpoints, /api-keys, /integrations auth-url)
- Feature type union (`Feature`) ensures compile-time safety

### Stripe integration:
- `src/app/api/stripe/webhook/route.ts` — handles checkout, subscription updates, cancellation, payment failures
- `src/app/api/stripe/checkout/route.ts` — creates Stripe Checkout sessions
- `src/app/api/stripe/portal/route.ts` — creates Stripe Customer Portal sessions
- `src/lib/stripe/client.ts` — Stripe SDK singleton
- Setup guide: `docs/stripe-setup.md`

### Pricing tiers:
| Tier | Price | Limits |
|------|-------|--------|
| Free | $0 | 1 client, 1 show, no integrations/webhooks/API keys |
| Pro | $29/mo or $289/yr | Unlimited everything, all integrations |
| Studio | $79/mo or $789/yr | Pro + multi-user, white-label (future) |

## Data Model

```
Organizations
├── Memberships (user ↔ org, with roles)
├── Subscriptions (Stripe billing state)
└── Clients (org_id)
    ├── Profile (contact, company, notes, service terms)
    ├── Meeting notes
    └── Shows
        ├── Show profile (name, description, format, schedule, branding)
        ├── Distribution connection (Transistor.fm)
        ├── Episode template (default description, notes)
        ├── Assets (cover art, intros, outros, music beds)
        └── Episodes
            ├── Pipeline stage (customizable per show, with position)
            ├── Episode assets (thumbnails, show notes, clips — R2)
            ├── Deliverables (approval workflow)
            ├── Episode integrations (Frame.io / Google Drive / Vimeo)
            ├── File references (external files linked to episodes/deliverables)
            ├── Review comments (timecoded, synced to Frame.io)
            └── Distribution (Transistor publish state)
```

## Auth Model

Two distinct auth paths:

1. **Producer auth** — Supabase session (magic link or OAuth) → `memberships` table → org context. Used for `/app/*` routes.
2. **Client auth** — Supabase session → `clients.client_user_id` match. Used for `/portal/*` routes. Clients do NOT have org memberships.
3. **API key auth** — Bearer token (`pr_` prefix) → SHA-256 hash lookup in `api_keys` table → resolves `org_id` directly. Used for external consumers (MCP, scripts).

The central auth helper is `getAuthenticatedClient()` in `src/lib/api/helpers.ts`, which returns `{ supabase, user, org, error }`.

## Key Shared Utilities

| File | Purpose |
|------|---------|
| `src/lib/supabase/server.ts` | `createClient()` (session-aware) and `createServiceClient()` (service role, no cookies) |
| `src/lib/api/helpers.ts` | `getAuthenticatedClient()`, `jsonResponse()`, `errorResponse()` |
| `src/lib/org/resolve.ts` | `resolveUserOrg()`, `resolveOrgFromApiKey()` |
| `src/lib/entitlements.ts` | `getOrgEntitlements()`, `isSelfHosted()`, `Feature` type |
| `src/lib/webhooks/dispatch.ts` | `dispatchWebhooks(orgId, event, data)` — fire-and-forget webhook delivery |
| `src/lib/integrations/token-refresh.ts` | `getValidToken(orgId, provider)`, `getIntegrationAccountId(orgId, provider)` |
| `src/lib/stripe/client.ts` | `getStripe()` — Stripe SDK singleton |
| `src/lib/r2/client.ts` | R2 upload URLs, image URL resolution |
| `src/lib/org/roles.ts` | `requireRole(org, minRole)` — role-based access control |
| `src/lib/email/send.ts` | `sendEmail()`, `generateMagicLinkUrl()`, `getSiteUrl()` — shared email helpers |

## Integrations

| Service | Role | Integration Type |
|---------|------|-----------------|
| Frame.io (V4) | Video review/approval | OAuth (Adobe IMS), project creation, file upload, comment sync |
| Google Drive | File delivery/review | OAuth2, folder hierarchy, resumable uploads |
| Vimeo | Video delivery | OAuth2, project creation, tus uploads |
| Transistor.fm | Episode publishing/distribution | API key per show, upload + publish |
| Cloudflare R2 | Asset storage (branding, thumbnails, intros) | S3-compatible API, signed URLs |
| Stripe | Subscription billing | Checkout, webhooks, customer portal |
| n8n | Workflow automation | Webhooks (send + receive) |
| MCP | AI assistant interaction | Local MCP server wrapping REST API |

## Feature Status

### Complete (Phases 1-3)
- Client/show/episode management with customizable pipeline stages
- Kanban board with drag-and-drop, bulk actions, swimlanes
- Dashboard with attention list, activity feed, stats, quick-create
- Calendar view across all shows
- Client portal with magic-link auth, deliverable approval, activity feed
- Review player with timecoded comments (synced to Frame.io)
- Multi-provider delivery (Frame.io, Google Drive, Vimeo)
- Transistor.fm publishing
- R2 asset management per show/episode
- Episode templates per show
- Tags system
- Webhook egress (signed payloads, delivery log)
- Webhook ingress (provider status sync)
- API key authentication
- MCP server
- Landing page with pricing

### Complete (Billing + Growth)
- Organizations/workspaces (multi-tenant foundation)
- Stripe integration (checkout, portal, webhooks)
- Plan entitlements system (database-driven feature flags)
- Billing settings page (upgrade, manage subscription)
- Self-hosted mode bypass
- Multi-user support (team invites, role-based access: owner/admin/member)
- Reporting and analytics (episodes, on-time rate, approval turnaround, by-show/by-month)
- Shared email helpers (`src/lib/email/send.ts`)
- White-label client portal (custom branding per org: logo, accent color, display name)
- License key system for self-hosted (soft gate, contact capture)

### Not Yet Built
- Custom domain support for white-label portal
- SSO / SAML
- Stripe Connect (producer invoicing their clients)

## Default Episode Pipeline Stages

```
Planning → Recording → Editing → Review → Approved → Published
```

Stages are customizable per show. Each stage has an optional `status_override` mapping to the `episode_status` enum.

## API Design Principles

- Every UI action maps to a documented API endpoint
- Token-based auth for external consumers (API keys with `pr_` prefix)
- Supabase auth (magic link, OAuth) for web UI and client portal
- Webhooks follow standard patterns (signed payloads, retry logic)
- MCP server is a thin wrapper over the REST API, not a separate system
- All inserts include both `user_id` (attribution) and `org_id` (ownership)
- Ownership checks use `org_id`, not `user_id`

## Supabase Projects

| Environment | Project ID | Name |
|------------|------------|------|
| Dev | `pvcrgllkcvznpxsxlehm` | Preroll.io-v2-dev |
| Prod | `bjslxxufxvzssgrcmuzs` | Preroll.io-v2 |

Old projects (`muooiflyyjrtueabmzwy`, `fvbpmpfatzcrwpmmkqdn`) are inactive.

## Git & Deployment

- Gitea remote with auto-mirroring to GitHub
- GitHub triggers Vercel rebuilds
- Push to Gitea via HTTPS, not SSH
- Gitea API commits must use `tro2789@gmail.com` as author/committer email

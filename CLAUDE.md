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
| UI Components | shadcn/ui (Radix primitives) + Tailwind CSS v4 |
| Storage | Cloudflare R2 (branding, thumbnails, intros, light assets) |
| Deployment | Vercel |
| Payments | Stripe (subscriptions, checkout, customer portal) |
| AI | Anthropic Claude API (generation), Deepgram Nova-2 (transcription) |

## Environment Constraints

**Ports 3000-3002, 3005, 3010, 3020 are occupied** by Docker containers (n8n, Pingvin Share, Zipline, etc.). The dev server runs on **port 3003**.

**Dev server binds to 0.0.0.0** for LAN access. The dev machine is at `192.168.0.83`, accessed via SSH.

**Use SSH for git pushes** — remote is `ssh://gitea@192.168.0.245:2222/tro2789/preroll.io.git`. HTTPS doesn't work since `gitea.tohareprod.com` resolves to LAN via `/etc/hosts`.

## Multi-Tenancy & Billing

All data is scoped to **organizations** (not individual users). Every user belongs to an org via the `memberships` table. Solo producers have a 1-person org auto-created at signup.

### Key concepts:
- **`organizations`** — workspace with `plan_id`, `stripe_customer_id`, billing state
- **`memberships`** — links users to orgs with roles (`owner`, `admin`, `member`)
- **`org_id`** — present on `clients`, `tags`, `user_integrations`, `file_references`, `webhook_endpoints`, `api_keys`
- **RLS** — all producer-side policies use `user_org_ids()` helper function, not `auth.uid()` directly
- **`plan_entitlements`** — database-driven feature flags per plan (free/pro/studio)
- **`PREROLL_SELF_HOSTED=true`** — env var that bypasses all plan checks

### Free trial:
- New signups get a **7-day Studio trial** (`trial_ends_at` on `organizations`, set by the `create_default_org` trigger)
- During trial, free-plan users get Studio-level entitlements
- `computeTrialInfo()` in `src/lib/entitlements.ts` computes trial state
- Billing page shows trial countdown banner; upgrade gates show normally after trial expires

### Entitlements enforcement:
- API-layer enforcement via `getOrgEntitlements(orgId, planId?, trialEndsAt?)` in `src/lib/entitlements.ts`
- Accepts optional `planId` and `trialEndsAt` from `OrgContext` to skip redundant DB queries
- Checked at resource-creation boundaries AND page-level (server components gate before rendering)
- UI gates use shared `<UpgradeGate>` component (`src/components/ui/upgrade-gate.tsx`)
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
| Pro | $29/mo or $289/yr | Unlimited clients/shows, all integrations, webhooks, API keys, MCP, templates |
| Studio | $79/mo or $789/yr | Pro + multi-user, white-label branding, reporting/analytics |

All new signups get a 7-day Studio trial.

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
            ├── Shared files / deliverables (approval workflow — "Share" in UI, "deliverables" in DB/API)
            ├── Episode integrations (Frame.io / Google Drive / Vimeo)
            ├── File references (external files linked to episodes/deliverables)
            ├── Review comments (timecoded, synced to Frame.io)
            ├── Transcriptions (Deepgram, async with webhook callback)
            ├── AI generations (show notes, descriptions, social copy from transcripts)
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
| `src/lib/org/resolve.ts` | `resolveUserOrg()`, `resolveOrgFromApiKey()` → returns `OrgContext` (id, planId, trialEndsAt, role) |
| `src/lib/entitlements.ts` | `getOrgEntitlements()`, `computeTrialInfo()`, `isSelfHosted()`, `Feature` type |
| `src/lib/format.ts` | `formatFileSize()`, `formatDuration()`, `formatTimecode()`, timecode converters |
| `src/lib/utils.ts` | `cn()` — Tailwind class composition (clsx + tailwind-merge) |
| `src/lib/constants/deliverables.ts` | `Deliverable` type, `DELIVERABLE_TYPES`, `TYPE_LABELS`, `STATUS_STYLES` |
| `src/components/ui/upgrade-gate.tsx` | `<UpgradeGate>` — shared upgrade prompt for gated features |
| `src/lib/webhooks/dispatch.ts` | `dispatchWebhooks(orgId, event, data)` — fire-and-forget webhook delivery |
| `src/lib/integrations/token-refresh.ts` | `getValidToken(orgId, provider)`, `getIntegrationAccountId(orgId, provider)` |
| `src/lib/stripe/client.ts` | `getStripe()` — Stripe SDK singleton |
| `src/lib/r2/client.ts` | R2 upload URLs, image URL resolution |
| `src/lib/org/roles.ts` | `requireRole(org, minRole)` — role-based access control |
| `src/lib/email/send.ts` | `sendEmail()`, `generateMagicLinkUrl()`, `getSiteUrl()` — shared email helpers |
| `src/lib/ai/entitlements.ts` | `getAiAddonStatus()`, `consumeCredits()`, `getDeepgramApiKey()`, `getAnthropicApiKey()` |
| `src/lib/ai/deepgram.ts` | `submitTranscription()`, `parseDeepgramResponse()` — Deepgram Nova-2 client |
| `src/lib/ai/generate.ts` | `generate()` — Claude API content generation |
| `src/lib/ai/prompts.ts` | Prompt templates for show notes, descriptions, social copy, titles |

## Integrations

| Service | Role | Integration Type |
|---------|------|-----------------|
| Frame.io (V4) | Video review/approval | OAuth (Adobe IMS), project creation, file upload, comment sync |
| Google Drive | File delivery/review | OAuth2, folder hierarchy, resumable uploads |
| Vimeo | Video delivery | OAuth2, project creation, tus uploads |
| Transistor.fm | Episode publishing/distribution | API key per show, upload + publish |
| Cloudflare R2 | Asset storage (branding, thumbnails, intros) | S3-compatible API, signed URLs |
| Deepgram | Audio transcription | Nova-2 API, webhook callbacks, speaker diarization |
| Anthropic Claude | AI content generation | Show notes, descriptions, social copy, titles from transcripts |
| Stripe | Subscription billing + AI credits | Checkout, webhooks, customer portal, one-time credit packs |
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
- Stripe integration (checkout, portal, webhooks) — configured in dev, needs live keys for prod
- Plan entitlements system (database-driven feature flags)
- Billing settings page (upgrade, manage subscription, trial countdown)
- Self-hosted mode bypass
- Multi-user support (team invites, role-based access: owner/admin/member)
- Reporting and analytics (episodes, on-time rate, approval turnaround, by-show/by-month)
- Shared email helpers (`src/lib/email/send.ts`)
- White-label client portal (custom branding per org: logo, accent color, display name)
- License key system for self-hosted (soft gate, contact capture)
- 7-day Studio trial for new signups
- Standardized upgrade gates across all gated features (shared `<UpgradeGate>` component)

### Complete (AI Add-on)
- AI add-on system (metered, separate from plan tiers)
- Episode transcription via Deepgram Nova-2 (async webhook callback + Supabase Realtime)
- AI content generation from transcripts (show notes, descriptions, social copy, title suggestions)
- Prepaid credit packs via Stripe one-time checkout
- AI settings page (enable/disable, credit balance, purchase, BYOK keys for self-hosted)
- Atomic credit consumption with RPC functions
- shadcn/ui component library (tabs, badge, separator, tooltip, button, card, dialog, input, etc.)

### Complete (Design System)
- Sitewide contrast audit — `text-tertiary` upgraded to `text-secondary` where needed (~300 changes)
- shadcn/ui adopted as component library
- Notion-style episode detail page (max-width container, property rows, no sidebar)
- Episode page: single continuous view (Files section + Details section, no tabs)
- "Deliverable" renamed to "Share" in user-facing UI text (API/DB unchanged)
- Shared constants extracted (`src/lib/constants/deliverables.ts`, `src/lib/format.ts`)

### Not Yet Built
- Custom domain support for white-label portal
- SSO / SAML
- Stripe Connect (producer invoicing their clients)
- Onboarding tour for new users

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
- **Use SSH for git pushes** — remote is `ssh://gitea@192.168.0.245:2222/tro2789/preroll.io.git`
- Gitea API commits must use `tro2789@gmail.com` as author/committer email

## AI Add-on Architecture

The AI add-on is **separate from plan tiers** (Free/Pro/Studio). It has its own billing via prepaid credit packs.

### Key concepts:
- **`ai_addon`** — per-org config (enabled, credits_balance, BYOK keys for self-hosted)
- **`transcriptions`** — async transcription jobs (pending → completed/failed)
- **`ai_generations`** — generation history (type, result, tokens, credits)
- **`ai_credit_usage`** — append-only audit log for credit consumption
- **Credits** — consumed per operation (1/min transcription, 1-3 per generation)
- **Self-hosted** — BYOK keys, no credits needed (`PREROLL_SELF_HOSTED=true` bypass)

### Async transcription flow:
1. `POST /api/v1/episodes/:id/transcribe` → submit audio URL to Deepgram
2. Deepgram processes → calls back to `POST /api/v1/webhooks/deepgram`
3. Webhook handler updates `transcriptions` table → Supabase Realtime pushes to frontend

### AI generation:
- `POST /api/v1/episodes/:id/generate` with `type` param (show_notes, description, social_twitter, etc.)
- Uses Claude Haiku via `@anthropic-ai/sdk`
- Prompts in `src/lib/ai/prompts.ts`

### Credit packs (Stripe one-time payments):
| Pack | Credits | Price |
|------|---------|-------|
| Starter | 100 | $9 |
| Growth | 500 | $39 |
| Scale | 1,000 | $69 |

### Environment variables:
```
DEEPGRAM_API_KEY=        # Transcription
ANTHROPIC_API_KEY=       # AI generation
STRIPE_AI_100_PRICE_ID=  # Credit pack prices (create in Stripe dashboard)
STRIPE_AI_500_PRICE_ID=
STRIPE_AI_1000_PRICE_ID=
```

## Design System

Uses **shadcn/ui** (Radix primitives) with Tailwind CSS v4 and OKLCH color tokens.

### Typography hierarchy:
| Role | Size | Weight | Color |
|------|------|--------|-------|
| Page title | text-2xl | font-bold | text-primary |
| Section heading | text-lg | font-semibold | text-primary |
| Card title | text-sm | font-semibold | text-primary |
| Body text | text-sm | font-normal | text-primary |
| Label | text-sm | font-medium | text-secondary |
| Caption | text-xs | font-medium | text-secondary |
| Hint (placeholder only) | text-xs | font-normal | text-tertiary |

### Rules:
- `text-tertiary` is ONLY for placeholder text and decorative elements — never for readable content
- Min font size for readable text: `text-xs` (0.694rem)
- Use `cn()` from `@/lib/utils` for conditional class composition
- Use shadcn components from `src/components/ui/` (add new ones with `npx shadcn@latest add <name>`)
- Max-width containers: `max-w-4xl` for detail pages, `max-w-6xl` for list/grid pages
- Property rows (Notion-style) for metadata, not sidebars

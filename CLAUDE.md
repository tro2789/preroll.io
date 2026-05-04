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
| Payments (future) | Stripe |

## Environment Constraints

**Port 3000 is NOT available.** It's used by another Docker container on this network. Always use a non-standard port (e.g., 3001, 3002) to avoid conflicts.

**Dev server binds to 0.0.0.0** for LAN access. The dev machine is at `192.168.0.83`, accessed via SSH.

**Prefer HTTPS over SSH** for git pushes (SSH may be blocked in Claude Code's sandbox).

## Data Model

```
Clients
├── Profile (contact, company, notes, service terms)
├── Meeting notes
└── Shows
    ├── Show profile (name, description, format, schedule, branding)
    ├── Hosting connection (Transistor.fm)
    ├── Assets (cover art, intros, outros, music beds, templates)
    ├── Launch checklist (for new shows)
    └── Episodes
        ├── Pipeline status (customizable stages)
        ├── Assets (thumbnails, show notes, clips)
        ├── Approvals (client sign-off on deliverables)
        ├── External links (Frame.io review, raw file locations)
        └── Publish details (date, links, Transistor episode ID)
```

## Core Features

### Phase 1 — Internal Ops (MVP)
- Client profiles (contact, show details, service terms, notes)
- Show management (one client can have multiple shows)
- Episode pipeline with customizable stages
- Dashboard: "what needs my attention today" across all shows
- Meeting notes per client
- Basic asset library per show (R2-backed)
- REST API for all operations

### Phase 2 — Client Portal
- Magic-link auth (no passwords)
- Client sees: their show(s), current episode status, pending approvals
- Approval workflow: deliverables pushed for approve/revise with notes
- Frame.io links embedded in episode cards
- Activity feed for episode status changes

### Phase 3 — Automation + Integrations
- Transistor.fm integration: publish episodes directly
- Webhook ingress (Frame.io approval → status update, etc.)
- Webhook egress (status changes → n8n, notifications)
- Episode templates: recurring checklist auto-created per schedule
- Launch checklist templates for new shows
- Calendar view across all shows
- MCP server package (local, wraps the REST API)

### Phase 4 — Growth
- Client onboarding intake form
- Reporting (episodes delivered, on-time rate, approval turnaround)
- Multi-user support (VAs, subcontractors with scoped access)
- White-label client portal
- Stripe billing (productize for other producers)

## Integrations

| Service | Role | Integration Type |
|---------|------|-----------------|
| Frame.io | Video review/approval | Link embedding + webhook status sync |
| Transistor.fm | Episode publishing/distribution | REST API (upload + publish) |
| Cloudflare R2 | Asset storage (branding, thumbnails, intros) | S3-compatible API, signed URLs |
| n8n | Workflow automation | Webhooks (send + receive) |
| MCP | AI assistant interaction | Local MCP server wrapping REST API |

## Default Episode Pipeline Stages

```
Planning → Recording → Editing → Review → Approved → Published
```

Stages are customizable per show.

## Client Portal Design

- Lightweight — more like a status page than a full app
- Magic-link auth (client receives email link, no password)
- Client sees only their show(s), scoped via Supabase RLS
- Approve/revise workflow for deliverables (not Frame.io-level annotation — simple yes/no + notes)
- Activity feed showing episode progress without client needing to ask

## API Design Principles

- Every UI action maps to a documented API endpoint
- Token-based auth for external consumers (API keys)
- Supabase auth (magic link, OAuth) for web UI and client portal
- Webhooks follow standard patterns (signed payloads, retry logic)
- MCP server is a thin wrapper over the REST API, not a separate system

## Git & Deployment

- Gitea remote with auto-mirroring to GitHub
- GitHub triggers Vercel rebuilds
- Push to Gitea via HTTPS, not SSH
- Gitea API commits must use `tro2789@gmail.com` as author/committer email

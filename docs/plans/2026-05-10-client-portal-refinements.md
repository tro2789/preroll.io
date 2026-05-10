# Client Portal Refinements

## Problem

The client portal works but lacks polish in three areas: new clients have no orientation, clients can't download deliverables, and producers have no way to add context when submitting deliverables for review.

## 1. Welcome Card

A dismissible card at the top of the portal dashboard on first visit. Explains what the portal is and what the client can do.

### Content
- Header: "Welcome to your portal"
- Body: Brief explanation — "This is where you'll review episodes, approve deliverables, and track progress for your shows with [Producer/Org Name]."
- Bullet points: what they can do (review & approve deliverables, track episode progress, view show assets)
- Dismiss button that persists the dismissal

### Implementation
- Track dismissal via `portal_welcome_dismissed_at` on the `clients` table
- Render the card in the portal dashboard page when `portal_welcome_dismissed_at` is null
- Dismiss calls a lightweight API endpoint to set the timestamp
- Use the org's display name (white-label) or "your producer" as fallback

### Files
- Modify: `src/app/portal/page.tsx` — render welcome card conditionally
- New: `src/components/portal/welcome-card.tsx` — the card component
- Modify: `clients` table — add `portal_welcome_dismissed_at` column
- New or modify: API endpoint to dismiss (PATCH on client record)

## 2. Deliverable Downloads

Download button on deliverable cards in the client portal. Gated by a two-level setting: org default + show override.

### Download Setting

**Organization level** (global default):
- `allow_client_downloads` boolean on `organizations` table, defaults to `true`

**Show level** (override):
- `allow_client_downloads` boolean on `shows` table, defaults to `null` (inherit from org)

**Resolution logic:** show setting if not null, otherwise org default.

### UI — Producer Side
- Org settings page: toggle for "Allow clients to download deliverables" (default ON)
- Show edit page: tri-state select — "Use default" / "Allow" / "Disallow"

### UI — Client Side
- Download button on each deliverable card in the portal
- Only visible when the resolved setting is ON
- Downloads the file from whatever provider the deliverable is stored on (R2 signed URL, or external provider URL)

### Files
- Modify: `organizations` table — add `allow_client_downloads` (boolean, default true)
- Modify: `shows` table — add `allow_client_downloads` (boolean, nullable)
- Modify: `src/app/app/settings/workspace/page.tsx` — add toggle
- Modify: `src/app/app/shows/[showId]/edit` — add tri-state setting
- Modify: `src/components/portal/deliverable-card.tsx` — add download button
- Modify: portal page/layout — resolve download setting and pass to cards

## 3. Producer Notes on Deliverables

A text field on deliverables that producers fill in when uploading/submitting. Shown to clients alongside the deliverable in the portal.

### Implementation
- `producer_notes` text column on `deliverables` table
- Producer enters notes when creating/uploading a deliverable (textarea in the upload form)
- Notes are editable after creation (inline edit or via deliverable detail)
- Client sees notes rendered on the deliverable card in the portal, below the title

### Files
- Modify: `deliverables` table — add `producer_notes` text column
- Modify: deliverable upload/create UI — add notes textarea
- Modify: `src/components/portal/deliverable-card.tsx` — render notes
- Modify: deliverable API routes — accept and return `producer_notes`

## Build Sequence

1. Database migrations (all three features' columns)
2. Producer notes on deliverables (simplest, self-contained)
3. Welcome card (self-contained, no dependencies)
4. Download setting + download button (most complex, touches org settings + show edit + portal)

## Out of Scope

- Messaging/chat system between producers and clients
- Episode-level download overrides
- File versioning or download history tracking

# PreRoll Phase 2: Client Portal Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a client-facing portal where clients can check episode status, view/approve deliverables, and see their show's brand assets — without emailing the producer.

**Architecture:** Separate `/portal` route tree with its own lightweight layout. Clients are invited via a unique link, onboard themselves (magic-link auth), and see only their own show(s). Approvals are per-episode for production deliverables and per-show for brand assets. RLS scopes all portal queries to the client's own data.

**Tech Stack:** Same as Phase 1 (Next.js 16, Supabase, Tailwind v4). Magic-link auth via Supabase. No additional dependencies.

---

## Data Model Changes

### New columns on `clients`

```sql
-- Links a Supabase auth user to their client record
ALTER TABLE clients ADD COLUMN client_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Invite system
ALTER TABLE clients ADD COLUMN invite_code text UNIQUE;
ALTER TABLE clients ADD COLUMN invite_sent_at timestamptz;
ALTER TABLE clients ADD COLUMN onboarded_at timestamptz;
```

### New table: `deliverables`

A deliverable is something the producer pushes to the client for review. It can be tied to an episode (most common) or to a show (brand assets).

```sql
CREATE TYPE deliverable_status AS ENUM ('pending', 'approved', 'revision_requested');
CREATE TYPE deliverable_type AS ENUM (
  'rough_cut', 'final_cut', 'thumbnail', 'show_notes',
  'cover_art', 'intro', 'outro', 'social_clip', 'other'
);

CREATE TABLE deliverables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  show_id uuid REFERENCES shows(id) ON DELETE CASCADE NOT NULL,
  episode_id uuid REFERENCES episodes(id) ON DELETE CASCADE,  -- null = show-level (brand asset)
  type deliverable_type NOT NULL DEFAULT 'other',
  title text NOT NULL,
  description text,
  file_url text,           -- R2 signed URL or external link (Frame.io, Drive, etc.)
  file_key text,           -- R2 object key (if stored in R2)
  status deliverable_status DEFAULT 'pending',
  reviewer_notes text,     -- client's feedback when requesting revision
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER deliverables_updated_at BEFORE UPDATE ON deliverables
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### New table: `activity_log`

Tracks status changes so the client can see a feed of what's happening.

```sql
CREATE TABLE activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  show_id uuid REFERENCES shows(id) ON DELETE CASCADE NOT NULL,
  episode_id uuid REFERENCES episodes(id) ON DELETE CASCADE,
  action text NOT NULL,       -- e.g. 'episode_stage_changed', 'deliverable_submitted', 'deliverable_approved'
  description text NOT NULL,  -- human-readable: "Episode 5 moved to Editing"
  metadata jsonb,             -- optional structured data
  created_at timestamptz DEFAULT now()
);
```

### RLS Policies

```sql
-- Deliverables: producer access via show→client ownership
ALTER TABLE deliverables ENABLE ROW LEVEL SECURITY;
CREATE POLICY deliverables_producer ON deliverables FOR ALL
  USING (show_id IN (SELECT s.id FROM shows s JOIN clients c ON s.client_id = c.id WHERE c.user_id = auth.uid()));

-- Deliverables: client can SELECT and UPDATE (for approve/revise) their own
CREATE POLICY deliverables_client ON deliverables FOR SELECT
  USING (show_id IN (SELECT s.id FROM shows s JOIN clients c ON s.client_id = c.id WHERE c.client_user_id = auth.uid()));
CREATE POLICY deliverables_client_review ON deliverables FOR UPDATE
  USING (show_id IN (SELECT s.id FROM shows s JOIN clients c ON s.client_id = c.id WHERE c.client_user_id = auth.uid()))
  WITH CHECK (show_id IN (SELECT s.id FROM shows s JOIN clients c ON s.client_id = c.id WHERE c.client_user_id = auth.uid()));

-- Activity log: producer full access, client read-only
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY activity_log_producer ON activity_log FOR ALL
  USING (show_id IN (SELECT s.id FROM shows s JOIN clients c ON s.client_id = c.id WHERE c.user_id = auth.uid()));
CREATE POLICY activity_log_client ON activity_log FOR SELECT
  USING (show_id IN (SELECT s.id FROM shows s JOIN clients c ON s.client_id = c.id WHERE c.client_user_id = auth.uid()));

-- Clients: client can read and update their own record (for onboarding)
CREATE POLICY clients_self ON clients FOR SELECT
  USING (client_user_id = auth.uid());
CREATE POLICY clients_self_update ON clients FOR UPDATE
  USING (client_user_id = auth.uid())
  WITH CHECK (client_user_id = auth.uid());

-- Shows: client can read their own shows
CREATE POLICY shows_client ON shows FOR SELECT
  USING (client_id IN (SELECT id FROM clients WHERE client_user_id = auth.uid()));

-- Episodes: client can read episodes for their shows
CREATE POLICY episodes_client ON episodes FOR SELECT
  USING (show_id IN (SELECT s.id FROM shows s JOIN clients c ON s.client_id = c.id WHERE c.client_user_id = auth.uid()));

-- Pipeline stages: client can read
CREATE POLICY pipeline_stages_client ON pipeline_stages FOR SELECT
  USING (show_id IN (SELECT s.id FROM shows s JOIN clients c ON s.client_id = c.id WHERE c.client_user_id = auth.uid()));

-- Assets: client can read show assets
CREATE POLICY assets_client ON assets FOR SELECT
  USING (show_id IN (SELECT s.id FROM shows s JOIN clients c ON s.client_id = c.id WHERE c.client_user_id = auth.uid()));
```

---

## File Structure (New Files)

```
src/
├── app/
│   ├── portal/
│   │   ├── layout.tsx              -- Portal layout (simpler than app layout)
│   │   ├── page.tsx                -- Portal dashboard (client's shows)
│   │   ├── shows/
│   │   │   └── [showId]/
│   │   │       ├── page.tsx        -- Show overview (episode timeline + status)
│   │   │       ├── episodes/
│   │   │       │   └── [episodeId]/
│   │   │       │       └── page.tsx -- Episode detail with deliverables + approval
│   │   │       └── assets/
│   │   │           └── page.tsx    -- Brand assets with approval
│   │   └── onboarding/
│   │       └── page.tsx            -- Client onboarding form (after invite)
│   ├── invite/
│   │   └── [code]/
│   │       └── page.tsx            -- Invite link landing page → magic link auth
│   ├── api/
│   │   └── v1/
│   │       ├── invites/
│   │       │   └── route.ts        -- POST (generate invite for a client)
│   │       ├── deliverables/
│   │       │   ├── route.ts        -- GET (list), POST (create)
│   │       │   └── [deliverableId]/
│   │       │       └── route.ts    -- GET, PATCH (update status/review)
│   │       └── activity/
│   │           └── route.ts        -- GET (list activity for show)
│   └── ...
├── components/
│   ├── portal/
│   │   ├── portal-header.tsx       -- Simple header for portal
│   │   ├── episode-timeline.tsx    -- Visual episode progress for client
│   │   ├── deliverable-card.tsx    -- Deliverable with approve/revise buttons
│   │   └── activity-feed.tsx       -- Activity feed component
│   ├── deliverables/
│   │   ├── deliverable-form.tsx    -- Producer: submit deliverable for review
│   │   └── deliverable-list.tsx    -- Producer: view deliverables + status
│   └── ...
└── ...
```

---

## API Endpoints (New)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/invites` | Generate invite code + link for a client |
| POST | `/api/v1/invites/accept` | Accept invite, link auth user to client record |
| GET | `/api/v1/deliverables?show_id=&episode_id=` | List deliverables (filterable) |
| POST | `/api/v1/deliverables` | Create deliverable (producer pushes for review) |
| GET | `/api/v1/deliverables/:id` | Get deliverable detail |
| PATCH | `/api/v1/deliverables/:id` | Update deliverable (approve/revise by client, edit by producer) |
| GET | `/api/v1/activity?show_id=` | List activity log for a show |

---

## Build Sequence

### Task 1: Database Migration — Portal Schema

**Files:**
- Create: `supabase/migrations/002_client_portal.sql`

Write the migration with all new columns, tables, triggers, and RLS policies from the schema above.

**Commit:** `feat: add client portal database schema (deliverables, activity, invites)`

---

### Task 2: Invite System API

**Files:**
- Create: `src/app/api/v1/invites/route.ts`
- Create: `src/app/api/v1/invites/accept/route.ts`

**POST `/api/v1/invites`:**
- Producer-only (check auth, verify client belongs to producer)
- Body: `{ client_id }`
- Generate a random invite code (`crypto.randomUUID()`)
- Store on the client record (`invite_code`, `invite_sent_at`)
- Return: `{ data: { invite_url: "/invite/{code}", invite_code } }`

**POST `/api/v1/invites/accept`:**
- Body: `{ invite_code }`
- Look up client by invite_code
- Set `client_user_id` to the authenticated user's ID
- Set `onboarded_at` to now (if not already set)
- Return the client record

**Commit:** `feat: add invite system API`

---

### Task 3: Invite Landing Page + Magic Link Auth

**Files:**
- Create: `src/app/invite/[code]/page.tsx`

**Flow:**
1. Page loads, validates the invite code via Supabase query
2. Shows the show name and producer name: "You've been invited to view [Show Name]"
3. Email input + "Send me a login link" button
4. Calls `supabase.auth.signInWithOtp({ email })` for magic link
5. After auth, redirect to `/portal/onboarding?invite={code}` (if not onboarded) or `/portal` (if already onboarded)

**Update middleware:** Add `/portal/*` to the protected routes matcher. Portal routes require auth.

**Commit:** `feat: add invite landing page with magic link auth`

---

### Task 4: Client Onboarding Page

**Files:**
- Create: `src/app/portal/onboarding/page.tsx`

**Flow:**
1. Client arrives after clicking magic link
2. Accept the invite (call POST `/api/v1/invites/accept`)
3. Form: company name, phone, any other details they want to share
4. Updates their own client record via PATCH `/api/v1/clients/{id}`
5. Redirect to `/portal`

**Commit:** `feat: add client onboarding page`

---

### Task 5: Portal Layout

**Files:**
- Create: `src/app/portal/layout.tsx`
- Create: `src/components/portal/portal-header.tsx`

**Design:** Cleaner, simpler than the producer layout. No sidebar — just a top header with:
- Show name (if single show) or "My Shows" dropdown (if multiple)
- Client name
- Sign out link

Light or dark theme — keep it dark for consistency but with softer tones. The portal should feel like a status page, not a management tool.

**Commit:** `feat: add portal layout with simple header`

---

### Task 6: Portal Dashboard

**Files:**
- Create: `src/app/portal/page.tsx`

**Shows:**
- List of client's shows (cards with show name, format, episode count)
- Pending approvals count badge on each show
- Click through to show detail

**If client has only one show:** Auto-redirect to that show's page.

**Commit:** `feat: add portal dashboard`

---

### Task 7: Portal Show Page (Episode Timeline)

**Files:**
- Create: `src/app/portal/shows/[showId]/page.tsx`
- Create: `src/components/portal/episode-timeline.tsx`

**Shows:**
- Show name and description at top
- Episode list as a timeline/status view (NOT a kanban — clients don't need to see all 6 stages)
- Each episode shows: title, episode number, current stage as a status badge, scheduled publish date
- Pending deliverables highlighted: "2 items need your review"
- Click episode → episode detail with deliverables
- Link to show brand assets

**Commit:** `feat: add portal show page with episode timeline`

---

### Task 8: Deliverables API

**Files:**
- Create: `src/app/api/v1/deliverables/route.ts`
- Create: `src/app/api/v1/deliverables/[deliverableId]/route.ts`

**POST `/api/v1/deliverables`:** (producer)
- Body: `{ show_id, episode_id?, type, title, description?, file_url?, file_key? }`
- Creates deliverable with status 'pending'
- Logs activity: "Deliverable submitted for review: {title}"

**PATCH `/api/v1/deliverables/:id`:** (client or producer)
- Client can set `status` to 'approved' or 'revision_requested' and add `reviewer_notes`
- Producer can update title, description, file_url, or reset status to 'pending' (resubmit)
- Logs activity on status change

**GET `/api/v1/deliverables`:**
- Filterable by `show_id`, `episode_id`, `status`
- Returns with episode title joined

**Commit:** `feat: add deliverables API with activity logging`

---

### Task 9: Activity Log API

**Files:**
- Create: `src/app/api/v1/activity/route.ts`

**GET `/api/v1/activity`:**
- Required: `show_id`
- Returns activity entries ordered by `created_at` desc
- Limit 50 by default

**Commit:** `feat: add activity log API`

---

### Task 10: Portal Episode Detail + Approval UI

**Files:**
- Create: `src/app/portal/shows/[showId]/episodes/[episodeId]/page.tsx`
- Create: `src/components/portal/deliverable-card.tsx`

**Shows:**
- Episode title, number, current stage, description
- Frame.io link (if set) — embedded or prominent link
- Deliverables list: each deliverable shows type, title, file/link, status
- For pending deliverables: "Approve" and "Request Revision" buttons
- Revision request opens a text input for notes
- Approved items show green check + timestamp

**Commit:** `feat: add portal episode detail with approval workflow`

---

### Task 11: Portal Brand Assets Page

**Files:**
- Create: `src/app/portal/shows/[showId]/assets/page.tsx`

**Shows:**
- Show-level assets (cover art, intro, outro, etc.) from the assets table
- Show-level deliverables (where episode_id is null) with approval workflow
- Client can approve or request revision on brand deliverables

**Commit:** `feat: add portal brand assets page with approval`

---

### Task 12: Producer Deliverable Management

**Files:**
- Create: `src/components/deliverables/deliverable-form.tsx`
- Create: `src/components/deliverables/deliverable-list.tsx`
- Modify: `src/app/app/shows/[showId]/episodes/[episodeId]/page.tsx`

Add to the producer's episode detail page:
- "Submit for Review" button → form to create a deliverable
- List of existing deliverables with their status (pending/approved/revision requested)
- Client feedback visible on revision-requested items

**Commit:** `feat: add deliverable management to producer episode view`

---

### Task 13: Producer Invite UI

**Files:**
- Modify: `src/app/app/clients/[clientId]/page.tsx`

Add to the client detail page:
- "Invite to Portal" button (if no `client_user_id` set)
- Generates invite link via API
- Shows the link for copying/sharing
- If already invited: shows invite status (invited, onboarded)

**Commit:** `feat: add invite button to client detail page`

---

### Task 14: Activity Feed Component + Integration

**Files:**
- Create: `src/components/portal/activity-feed.tsx`
- Modify: `src/app/portal/shows/[showId]/page.tsx`

Add activity feed to the portal show page — recent activity at the bottom showing episode movements, deliverable submissions, approvals.

**Commit:** `feat: add activity feed to portal show page`

---

### Task 15: Automatic Activity Logging

**Files:**
- Modify: `src/app/api/v1/shows/[showId]/episodes/[episodeId]/route.ts`
- Modify: `src/app/api/v1/deliverables/[deliverableId]/route.ts`

Update existing API routes to log activity when:
- Episode stage changes → "Episode '{title}' moved to {stage}"
- Deliverable submitted → "'{title}' submitted for review"
- Deliverable approved → "'{title}' approved"
- Deliverable revision requested → "Revision requested on '{title}'"

**Commit:** `feat: add automatic activity logging on episode and deliverable changes`

---

### Task 16: Polish + Test Full Flow

**Steps:**
1. Test full invite flow: generate invite → client clicks link → magic link auth → onboarding → portal
2. Test deliverable flow: producer submits → client sees in portal → approves/revises → producer sees feedback
3. Test activity feed: verify all actions show up
4. Verify RLS: client cannot see other clients' data
5. Verify producer can see all deliverable statuses from their view

**Commit:** `fix: portal polish and edge case fixes`

---

## Middleware Updates

The existing middleware at `src/middleware.ts` needs to also protect `/portal/*` routes:

```typescript
export const config = {
  matcher: ['/app/:path*', '/portal/:path*'],
}
```

The redirect for unauthenticated portal users should go to `/login` (or we could create a separate portal login, but magic links handle this).

---

## Phase 2-4 Considerations

### Email Notifications (Phase 3)
- When producer submits a deliverable, email the client
- When client approves/revises, email the producer
- Use Supabase Edge Functions or webhook to n8n for email sending
- Activity log entries are the triggers

### Webhook Egress (Phase 3)
- Activity log entries can fire webhooks for n8n integration
- Deliverable status changes → webhook → n8n → Slack/Discord/email notification

### White-Label Portal (Phase 4)
- Client portal could be branded per-producer (custom colors, logo)
- Portal layout already separated, making this straightforward

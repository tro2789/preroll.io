# Video/Audio Review Player with Timecoded Comments

**Goal:** Let clients watch or listen to deliverables and leave timestamped feedback directly in PreRoll's client portal. Comments sync bidirectionally with Frame.io so editors see them in their native tool.

**Key insight:** Clients should never need a Frame.io account or leave PreRoll. The producer's stored Frame.io token handles all API calls server-side.

---

## Design Principles

- **Local-first comments:** Comments save instantly to a local table. Push to Frame.io async in the same request. If Frame.io is down, the client experience is unaffected.
- **Producer token, client experience:** Video/audio URLs are fetched server-side using the producer's Frame.io integration token. Clients never authenticate with Frame.io.
- **Video and audio only:** The review player handles video and audio deliverables. Other file types get a download link — no in-app preview.
- **Text comments with timecodes:** No drawing tools, no annotations, no threading. Simple timecoded text, same as Frame.io's core review workflow.

---

## Data Model

### New table: `review_comments`

```sql
CREATE TABLE review_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deliverable_id uuid REFERENCES deliverables(id) ON DELETE CASCADE NOT NULL,
  file_reference_id uuid REFERENCES file_references(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name text NOT NULL,
  text text NOT NULL,
  timestamp_secs double precision,  -- seconds into playback, nullable for general comments
  external_id text,                 -- Frame.io comment ID, set after sync
  synced_at timestamptz,            -- null = not yet pushed to Frame.io
  is_external boolean DEFAULT false, -- true = originated in Frame.io
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_review_comments_deliverable ON review_comments(deliverable_id);
CREATE INDEX idx_review_comments_external ON review_comments(external_id) WHERE external_id IS NOT NULL;
```

`author_name` is denormalized so we can display Frame.io editor names without a local user record. For client comments, populated from the client's name.

### RLS Policies

```sql
ALTER TABLE review_comments ENABLE ROW LEVEL SECURITY;

-- Producer: full access via show ownership chain
CREATE POLICY review_comments_producer ON review_comments FOR ALL
  USING (deliverable_id IN (
    SELECT d.id FROM deliverables d
    JOIN shows s ON d.show_id = s.id
    JOIN clients c ON s.client_id = c.id
    WHERE c.user_id = auth.uid()
  ));

-- Client: can read all comments and insert their own
CREATE POLICY review_comments_client_read ON review_comments FOR SELECT
  USING (deliverable_id IN (
    SELECT d.id FROM deliverables d
    JOIN shows s ON d.show_id = s.id
    JOIN clients c ON s.client_id = c.id
    WHERE c.client_user_id = auth.uid()
  ));

CREATE POLICY review_comments_client_insert ON review_comments FOR INSERT
  WITH CHECK (deliverable_id IN (
    SELECT d.id FROM deliverables d
    JOIN shows s ON d.show_id = s.id
    JOIN clients c ON s.client_id = c.id
    WHERE c.client_user_id = auth.uid()
  ) AND user_id = auth.uid());
```

### No changes to existing tables

- `file_references` already has `external_id` (Frame.io file ID), `mime_type`, `duration_seconds`
- `deliverables` already has `file_url`, `type`, `status`
- `episode_integrations` already links episodes to Frame.io projects

---

## API Routes

### `GET /api/v1/deliverables/:deliverableId/media`

Returns a signed playback URL for the deliverable's linked Frame.io file.

**Flow:**
1. Look up deliverable → find linked `file_reference` with a Frame.io `external_id`
2. Load the producer's Frame.io integration (token auto-refresh)
3. Call `GET /v4/accounts/{accountId}/files/{fileId}?include=media_links.high_quality,media_links.efficient`
4. Return: `{ url, mime_type, duration_seconds, status }`
5. If file status isn't `ready`, return `{ status: 'processing' }` so the UI can show a message

**Auth:** Portal client auth (via show ownership RLS chain).

### `GET /api/v1/deliverables/:deliverableId/comments`

Returns all comments for a deliverable, performing an initial sync with Frame.io.

**Flow:**
1. Load local `review_comments` for this deliverable
2. If the deliverable has a Frame.io file reference:
   a. Fetch comments from Frame.io: `GET /v4/accounts/{id}/files/{fileId}/comments?include=owner`
   b. For each Frame.io comment not already in local table (match on `external_id`): insert with `is_external = true`
   c. Convert Frame.io timestamp (HH:MM:SS:FF) to seconds
3. Return merged comment list sorted by `timestamp_secs` ASC, then `created_at` ASC

**Auth:** Portal client auth.

### `POST /api/v1/deliverables/:deliverableId/comments`

Creates a comment locally and pushes to Frame.io.

**Body:** `{ text, timestamp_secs }`

**Flow:**
1. Validate input, look up deliverable and client info
2. Insert into `review_comments` with `user_id`, `author_name` (from client record), `synced_at = null`
3. If deliverable has a Frame.io file reference:
   a. Convert `timestamp_secs` to `HH:MM:SS:00` format
   b. POST to `POST /v4/accounts/{id}/files/{fileId}/comments` with `{ data: { text, timestamp } }`
   c. On success: update local comment with `external_id` and `synced_at = now()`
   d. On failure: log error, leave `synced_at = null` (comment exists locally, client sees it)
4. Return the created comment

**Auth:** Portal client auth (INSERT policy ensures user_id = auth.uid()).

### Webhook handler update: `comment.created`

In the existing `/api/v1/webhooks/[provider]/route.ts`, add handling for `comment.created`:

1. Extract file ID from webhook payload
2. Look up `file_references` by `external_id` → get `deliverable_id`
3. Check if comment already exists locally (match `external_id`)
4. If not: insert into `review_comments` with `is_external = true`, `external_id`, `author_name` from payload, convert timestamp to seconds
5. Log activity

---

## Review Page

### Route

`/portal/shows/:showId/episodes/:episodeId/review/:deliverableId`

### Layout

**Header:** Back link to episode, deliverable title + type badge, download button (links to `file_url`)

**Desktop — two panels:**
- Left (2/3): Player area
- Right (1/3): Comments sidebar

**Mobile:** Stacks vertically — player on top, comments below

### Player Component (`ReviewPlayer`)

**Video mode** (mime_type starts with `video/`):
- HTML5 `<video>` element, fills available width, maintains aspect ratio
- Custom controls bar: play/pause button, current timecode (`MM:SS`), scrubber/progress bar, duration, volume slider
- Clicking the scrubber seeks to that position

**Audio mode** (mime_type starts with `audio/`):
- HTML5 `<audio>` element (hidden native controls)
- Styled playback bar: play/pause, timecode, progress bar, duration, volume
- Visual: gradient background or episode thumbnail as album art above the controls

**Shared behavior:**
- Exposes current playhead position (seconds) for comment input
- `onTimeUpdate` callback for syncing with comment sidebar
- If signed URL expires during playback (error event), auto-refetch from `/media` endpoint and resume
- Loading state while URL is being fetched
- "Processing" state if Frame.io hasn't finished transcoding

### Comments Sidebar (`CommentsSidebar`)

**Comment list:**
- Sorted by `timestamp_secs` ASC, then `created_at` ASC
- Comments without a timestamp appear in a "General" group at the top
- Each comment shows:
  - Author name
  - Timecode badge (e.g., `02:34`) — clickable, jumps player to that position
  - Comment text
  - Relative time ("2h ago")
  - Visual distinction for external (editor) comments: subtle "Producer" or "Editor" label
- Active comment highlighted based on current playhead position

**Comment input (pinned at bottom):**
- Text area
- Current playhead timecode shown as a pill/badge next to the input
- Submit button (or Enter to send)
- On submit: POST to comments API, optimistically add to list

---

## Deliverable Card Update

In the portal's `DeliverableCard` component, add a "Review" button that appears when:
- The deliverable has a linked `file_reference`
- The file's `mime_type` starts with `video/` or `audio/`

The button links to `/portal/shows/{showId}/episodes/{episodeId}/review/{deliverableId}`.

For non-video/audio deliverables with a `file_url`: show the existing "View file" link (opens in new tab, effectively a download).

---

## What We're NOT Building

- No drawing/annotation tools — text comments with timecodes only
- No reply threading — flat comment list sorted by timecode
- No comment editing or deletion from the portal
- No scrub sheet / thumbnail timeline preview
- No waveform visualization for audio (styled progress bar instead)
- No retry queue for failed Frame.io pushes (logged, comment exists locally)
- No file preview for non-audio/video types (download link only)

---

## Build Sequence

### Task 1: Database migration
Create `review_comments` table with indexes and RLS policies.

### Task 2: Media URL API route
`GET /api/v1/deliverables/:id/media` — fetch signed playback URL via producer's Frame.io token.

### Task 3: Comments API routes
`GET /POST /api/v1/deliverables/:id/comments` — local CRUD with Frame.io sync on write, initial sync on read.

### Task 4: Webhook handler for comment.created
Extend existing webhook route to insert external comments into `review_comments`.

### Task 5: ReviewPlayer component
HTML5 video/audio player with custom controls, timecode display, seek, volume. Exposes playhead position.

### Task 6: CommentsSidebar component
Comment list sorted by timecode, clickable timecode badges, active highlight, comment input with auto-timecode.

### Task 7: Review page
Wire player + sidebar together. Route at `/portal/shows/:showId/episodes/:episodeId/review/:deliverableId`. Desktop two-panel layout, mobile stack.

### Task 8: Update DeliverableCard
Add "Review" button for video/audio deliverables. Add download button to review page header.

### Task 9: Test full flow
Upload a video via delivery panel → tag as deliverable → open portal review page → play video → leave timecoded comment → verify it appears in Frame.io → leave comment in Frame.io → verify it appears in portal.

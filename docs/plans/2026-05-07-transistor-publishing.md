# Transistor.fm Publishing Integration

**Goal:** Let producers publish episodes directly to Transistor.fm from PreRoll — either immediately or scheduled for a future date. Audio is pulled from the episode's delivery provider (Frame.io, Google Drive, Vimeo) and uploaded to Transistor automatically.

**Key insight:** Publishing is a one-way door. The producer explicitly triggers it via a dialog where they review metadata before confirming. No auto-publish on stage change.

---

## Design Principles

- **Manual trigger, not automatic:** Producer clicks "Publish" on an approved episode, reviews metadata, and confirms. Scheduling supported.
- **Audio flows through PreRoll:** We download from the delivery provider and upload to Transistor via presigned S3. No expired URLs, no manual copy-paste.
- **Provider-agnostic data model:** Use a `distribution_provider` column instead of `transistor_show_id`. No shared abstraction layer yet — that waits for provider #2.
- **Pre-fill from PreRoll data:** The publish dialog maps existing episode data to Transistor fields. Producer edits only what needs to change.

---

## Transistor.fm API Summary

- **Auth:** API key in `x-api-key` header
- **Base URL:** `https://api.transistor.fm/v1`
- **Rate limit:** 10 requests per 10 seconds
- **Conforms to JSON:API spec** — responses wrap in `{ data: {...} }`

### Key Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v1/shows` | GET | List shows on the account |
| `/v1/shows/:id` | GET | Get show details |
| `/v1/episodes/authorize_upload` | GET | Get presigned S3 URL for audio upload |
| `/v1/episodes` | POST | Create draft episode |
| `/v1/episodes/:id` | PATCH | Update episode metadata |
| `/v1/episodes/:id/publish` | PATCH | Publish, schedule, or unpublish |

### Publishing Workflow

1. `GET /v1/episodes/authorize_upload?filename=final.mp3` → get `upload_url` + `audio_url`
2. `PUT {upload_url}` with audio file body and `Content-Type` header
3. `POST /v1/episodes` with show_id, title, description, audio_url, episode number, etc.
4. `PATCH /v1/episodes/:id/publish` with `status: 'published'` or `status: 'scheduled', published_at: '...'`

---

## Data Model

### New table: `distribution_connections`

Links a PreRoll show to a distribution provider account.

```sql
CREATE TABLE distribution_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  show_id uuid REFERENCES shows(id) ON DELETE CASCADE NOT NULL,
  provider text NOT NULL,  -- 'transistor' for now
  api_key_enc text NOT NULL,  -- encrypted API key
  external_show_id text NOT NULL,  -- Transistor show ID
  external_show_name text,
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(show_id, provider)
);
```

API key is encrypted using the same AES-256-GCM as delivery provider tokens (`src/lib/integrations/crypto.ts`).

### New columns on `episodes`

```sql
ALTER TABLE episodes ADD COLUMN distribution_status text;  -- null, 'draft', 'scheduled', 'published'
ALTER TABLE episodes ADD COLUMN distribution_external_id text;  -- Transistor episode ID
ALTER TABLE episodes ADD COLUMN distribution_published_at timestamptz;
ALTER TABLE episodes ADD COLUMN distribution_metadata jsonb;  -- provider-specific data (media_url, share_url, etc.)
```

Using generic `distribution_*` column names rather than `transistor_*` so the schema supports future providers.

### No changes to existing tables

The existing `transistor_show_id` on shows and `transistor_episode_id` on episodes (from Phase 1 schema) should be migrated to the new structure and then removed.

---

## API Routes

### `POST /api/v1/shows/:showId/distribution/connect`

Connect a show to Transistor. Producer provides their API key.

**Body:** `{ provider: 'transistor', api_key }`

**Flow:**
1. Validate the API key by calling `GET /v1` (returns authenticated user)
2. Fetch `GET /v1/shows` to list shows on the account
3. If only one show, auto-select. If multiple, return the list for the producer to pick.
4. Encrypt and store the API key, external show ID, and show name in `distribution_connections`

### `POST /api/v1/shows/:showId/distribution/connect/select`

If the account has multiple shows, producer picks one.

**Body:** `{ provider: 'transistor', external_show_id }`

### `GET /api/v1/shows/:showId/distribution`

Get the current distribution connection for a show. Returns provider, external show name, connection status.

### `DELETE /api/v1/shows/:showId/distribution`

Disconnect distribution. Removes the `distribution_connections` row. Does not affect already-published episodes on Transistor.

### `POST /api/v1/shows/:showId/episodes/:episodeId/publish`

The main publishing endpoint. Orchestrates the full flow.

**Body:**
```json
{
  "title": "Episode Title",
  "description": "Episode description for RSS",
  "episode_number": 12,
  "season_number": 1,
  "episode_type": "full",
  "scheduled_at": "2026-05-15T09:00:00",
  "audio_source": "deliverable:uuid" | "url:https://..."
}
```

**Flow:**
1. Look up `distribution_connections` for this show → get Transistor API key and show ID
2. Resolve the audio source:
   - If `deliverable:{id}`: find the file_reference, get a download URL from the delivery provider (Frame.io/Drive/Vimeo), download the audio
   - If `url:{url}`: use the URL directly (fallback)
3. Upload to Transistor:
   a. `GET /v1/episodes/authorize_upload?filename={name}` → get presigned URL + audio_url
   b. `PUT` the audio file to the presigned URL
   c. Wait for upload to complete
4. Create episode on Transistor:
   - `POST /v1/episodes` with show_id, title, description, audio_url, number, season, type
5. Publish or schedule:
   - If `scheduled_at` is set: `PATCH /v1/episodes/:id/publish` with `status: 'scheduled', published_at`
   - If no `scheduled_at`: `PATCH /v1/episodes/:id/publish` with `status: 'published'`
6. Update PreRoll episode: set `distribution_status`, `distribution_external_id`, `distribution_published_at`, `distribution_metadata` (with Transistor's `media_url`, `share_url`, etc.)
7. Log activity: "Episode published to Transistor" or "Episode scheduled for May 15 on Transistor"

### `GET /api/v1/shows/:showId/episodes/:episodeId/publish/status`

Check the distribution status of an episode. Returns the Transistor episode data if published.

---

## UI Components

### Distribution Settings (Show Settings Page)

Add a "Distribution" section to show settings or the show edit page:
- If not connected: "Connect to Transistor.fm" button → API key input → show selector (if multiple)
- If connected: shows provider name, linked show name, disconnect button

### Publish Dialog

A modal triggered from the episode detail page (producer side). Only visible when:
- The show has a distribution connection
- The episode has at least one audio deliverable (or audio file in delivery provider)

**Dialog contents:**
- Audio source selector: dropdown of audio deliverables/files for this episode
- Title (pre-filled from episode, editable)
- Description (pre-filled from episode description or show notes template, editable)
- Episode number (pre-filled, editable)
- Season number (optional, editable)
- Episode type: full / trailer / bonus (default: full)
- Publish mode toggle: "Publish Now" or "Schedule"
- If scheduling: date/time picker (pre-filled from `scheduled_publish_date`)
- Confirm button: "Publish" or "Schedule"

### Episode Status Indicator

On the episode detail page and kanban cards, show distribution status:
- No indicator if never published
- "Scheduled for May 15" with clock icon
- "Published" with check icon + link to Transistor share URL
- "Draft" if created on Transistor but not yet published

---

## Audio Download from Delivery Providers

The publish endpoint needs to download audio from the delivery provider before uploading to Transistor. This reuses existing infrastructure:

**Frame.io:** Use `getValidToken` + Frame.io media_links API → download from signed URL
**Google Drive:** Use stored OAuth token → `GET https://www.googleapis.com/drive/v3/files/{id}?alt=media`
**Vimeo:** Vimeo stores video, not audio — less common for podcast publishing

For MVP, focus on Frame.io and direct URL fallback. Google Drive support can follow.

The download → upload is a server-side operation. For large files, we stream rather than buffering the entire file in memory.

---

## What We're NOT Building (MVP)

- No auto-publish on pipeline stage change
- No provider abstraction layer (just Transistor client code)
- No transcript upload (Transistor supports it, add later)
- No custom artwork per episode (falls back to show art)
- No keywords or explicit flag in publish dialog (add later)
- No Transistor webhook consumption (can add for sync)
- No unpublish/update after publishing (producer uses Transistor dashboard)
- No Google Drive or Vimeo audio source (Frame.io + URL only for MVP)

---

## Build Sequence

### Task 1: Database migration
Create `distribution_connections` table. Add `distribution_*` columns to episodes. RLS policies.

### Task 2: Transistor API client
`src/lib/integrations/providers/transistor.ts` — API key auth, show listing, presigned upload, episode create, publish/schedule. Not implementing the full `IntegrationProviderClient` interface — standalone for now.

### Task 3: Distribution connection API routes
Connect/disconnect a show to Transistor. API key validation, show selection, encrypted storage.

### Task 4: Distribution settings UI
Add "Distribution" section to show settings. Connect flow with API key input and show picker.

### Task 5: Publish API route
`POST /api/v1/shows/:showId/episodes/:episodeId/publish` — download audio from delivery provider, upload to Transistor, create episode, publish/schedule, update PreRoll episode.

### Task 6: Publish dialog component
Modal on the producer's episode detail page. Audio source selector, metadata form, publish/schedule toggle, confirm.

### Task 7: Episode status indicator
Show distribution status on episode detail page and kanban cards.

### Task 8: Test full flow
Connect Transistor → pick an episode → select audio → publish → verify on Transistor dashboard → test scheduling.

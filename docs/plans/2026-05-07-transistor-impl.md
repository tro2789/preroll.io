# Transistor.fm Publishing — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Let producers publish or schedule episodes to Transistor.fm directly from PreRoll, with audio pulled from the delivery provider automatically.

**Architecture:** New `distribution_connections` table links shows to Transistor accounts (API key encrypted at rest). New `distribution_*` columns on episodes track publish state. A Transistor API client handles auth, uploads, and publishing. A publish dialog on the producer's episode detail page orchestrates the flow. Audio is downloaded from the delivery provider (Frame.io) and uploaded to Transistor server-side.

**Tech Stack:** Next.js App Router, Supabase, Transistor.fm REST API (JSON:API spec), AES-256-GCM encryption for API keys.

---

## Reference: Key Files

- **Crypto:** `src/lib/integrations/crypto.ts` — `encrypt()`, `decrypt()` for token/key storage
- **Token refresh:** `src/lib/integrations/token-refresh.ts` — `getValidToken()`, `getIntegrationAccountId()`
- **API helpers:** `src/lib/api/helpers.ts` — `getAuthenticatedClient()`, `jsonResponse()`, `errorResponse()`
- **Producer episode detail:** `src/app/app/shows/[showId]/episodes/[episodeId]/page.tsx` — where Publish button goes
- **Show edit page:** `src/app/app/shows/[showId]/edit/page.tsx` — where Distribution settings go
- **Episode card:** `src/components/episodes/episode-card.tsx` — needs status indicator
- **Delivery panel:** `src/components/episodes/delivery-panel.tsx` — pattern for provider integration UI
- **Design doc:** `docs/plans/2026-05-07-transistor-publishing.md`

## Reference: Existing Schema

**`shows`** already has: `transistor_show_id` (text, to be deprecated)
**`episodes`** already has: `transistor_episode_id` (text, to be deprecated), `scheduled_publish_date` (date), `published_at` (timestamptz), `status` (enum)

## Reference: Transistor.fm API

- **Base URL:** `https://api.transistor.fm/v1`
- **Auth:** `x-api-key` header
- **Rate limit:** 10 req / 10 sec
- **JSON:API spec** — responses in `{ data: { id, type, attributes: {...} } }` or `{ data: [...] }`
- **Key endpoints:**
  - `GET /v1` — verify API key, get user info
  - `GET /v1/shows` — list shows
  - `GET /v1/episodes/authorize_upload?filename=X` — get presigned S3 URL + final audio_url
  - `POST /v1/episodes` — create draft (form-encoded: `episode[show_id]`, `episode[title]`, etc.)
  - `PATCH /v1/episodes/:id/publish` — publish/schedule (`episode[status]`, `episode[published_at]`)

---

## Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/012_distribution.sql`

**Step 1: Write the migration**

```sql
-- Distribution connections: links a PreRoll show to a distribution provider
CREATE TABLE distribution_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  show_id uuid REFERENCES shows(id) ON DELETE CASCADE NOT NULL,
  provider text NOT NULL,
  api_key_enc text NOT NULL,
  external_show_id text NOT NULL,
  external_show_name text,
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(show_id, provider)
);

ALTER TABLE distribution_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY distribution_connections_producer ON distribution_connections FOR ALL
  USING (show_id IN (
    SELECT s.id FROM shows s
    JOIN clients c ON s.client_id = c.id
    WHERE c.user_id = auth.uid()
  ));

-- Distribution columns on episodes
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS distribution_status text;
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS distribution_external_id text;
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS distribution_published_at timestamptz;
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS distribution_metadata jsonb;
```

**Step 2: Apply via Supabase MCP**

Use `apply_migration` with project_id `pvcrgllkcvznpxsxlehm`, name `distribution`, and the SQL above.

**Step 3: Commit**

```bash
git add supabase/migrations/012_distribution.sql
git commit -m "feat: add distribution_connections table and episode distribution columns

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Transistor API Client

**Files:**
- Create: `src/lib/integrations/providers/transistor.ts`

**Step 1: Create the client**

A standalone module (not implementing `IntegrationProviderClient`) with functions for Transistor operations.

```tsx
// src/lib/integrations/providers/transistor.ts

const TRANSISTOR_API = 'https://api.transistor.fm/v1'

async function transistorFetch(path: string, apiKey: string, options?: RequestInit) {
  const res = await fetch(`${TRANSISTOR_API}${path}`, {
    ...options,
    headers: {
      'x-api-key': apiKey,
      ...options?.headers,
    },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Transistor API error ${res.status}: ${body}`)
  }
  return res.json()
}

export async function verifyApiKey(apiKey: string): Promise<{ id: string; name: string; email: string }> {
  const json = await transistorFetch('', apiKey)
  const user = json.data?.attributes || json.data
  return { id: json.data?.id, name: user?.name, email: user?.email }
}

export async function listShows(apiKey: string): Promise<{ id: string; name: string }[]> {
  const json = await transistorFetch('/shows', apiKey)
  const shows = json.data || []
  return shows.map((s: any) => ({ id: s.id, name: s.attributes?.title || s.attributes?.name || 'Untitled' }))
}

export async function authorizeUpload(apiKey: string, filename: string): Promise<{ uploadUrl: string; audioUrl: string; contentType: string }> {
  const json = await transistorFetch(`/episodes/authorize_upload?filename=${encodeURIComponent(filename)}`, apiKey)
  const attrs = json.data?.attributes || json.data
  return {
    uploadUrl: attrs.upload_url,
    audioUrl: attrs.audio_url,
    contentType: attrs.content_type,
  }
}

export async function createEpisode(apiKey: string, params: {
  showId: string
  title: string
  description?: string
  episodeNumber?: number
  seasonNumber?: number
  episodeType?: string
  audioUrl: string
}): Promise<{ id: string; attributes: Record<string, unknown> }> {
  const body = new URLSearchParams()
  body.set('episode[show_id]', params.showId)
  body.set('episode[title]', params.title)
  body.set('episode[audio_url]', params.audioUrl)
  if (params.description) body.set('episode[description]', params.description)
  if (params.episodeNumber != null) body.set('episode[number]', String(params.episodeNumber))
  if (params.seasonNumber != null) body.set('episode[season]', String(params.seasonNumber))
  if (params.episodeType) body.set('episode[type]', params.episodeType)

  const json = await transistorFetch('/episodes', apiKey, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })
  return { id: json.data.id, attributes: json.data.attributes }
}

export async function publishEpisode(apiKey: string, episodeId: string, params: {
  status: 'published' | 'scheduled' | 'draft'
  publishedAt?: string
}): Promise<Record<string, unknown>> {
  const body = new URLSearchParams()
  body.set('episode[status]', params.status)
  if (params.publishedAt) body.set('episode[published_at]', params.publishedAt)

  const json = await transistorFetch(`/episodes/${episodeId}/publish`, apiKey, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })
  return json.data?.attributes || {}
}

export async function getEpisode(apiKey: string, episodeId: string): Promise<Record<string, unknown>> {
  const json = await transistorFetch(`/episodes/${episodeId}`, apiKey)
  return json.data?.attributes || {}
}
```

**Step 2: Verify build**

Run: `npx next build 2>&1 | grep -E "(error|Error|✓)"`

**Step 3: Commit**

```bash
git add src/lib/integrations/providers/transistor.ts
git commit -m "feat: add Transistor.fm API client

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Distribution Connection API Routes

**Files:**
- Create: `src/app/api/v1/shows/[showId]/distribution/route.ts`
- Create: `src/app/api/v1/shows/[showId]/distribution/connect/route.ts`

**Step 1: Create the connection management route**

`src/app/api/v1/shows/[showId]/distribution/route.ts` — GET (status) and DELETE (disconnect):

```tsx
import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ showId: string }> }
) {
  const { showId } = await params
  const { supabase, error } = await getAuthenticatedClient()
  if (error) return error

  const { data } = await supabase!
    .from('distribution_connections')
    .select('id, provider, external_show_id, external_show_name, created_at')
    .eq('show_id', showId)
    .maybeSingle()

  return jsonResponse(data)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ showId: string }> }
) {
  const { showId } = await params
  const { supabase, error } = await getAuthenticatedClient()
  if (error) return error

  await supabase!
    .from('distribution_connections')
    .delete()
    .eq('show_id', showId)

  return jsonResponse({ success: true })
}
```

**Step 2: Create the connect route**

`src/app/api/v1/shows/[showId]/distribution/connect/route.ts` — POST to connect:

```tsx
import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'
import { encrypt } from '@/lib/integrations/crypto'
import { verifyApiKey, listShows } from '@/lib/integrations/providers/transistor'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ showId: string }> }
) {
  const { showId } = await params
  const { supabase, error } = await getAuthenticatedClient()
  if (error) return error

  const body = await request.json()
  const { provider, api_key, external_show_id } = body

  if (provider !== 'transistor') return errorResponse('Unsupported provider', 400)
  if (!api_key) return errorResponse('API key is required', 400)

  // Verify the API key
  try {
    await verifyApiKey(api_key)
  } catch {
    return errorResponse('Invalid Transistor API key', 401)
  }

  // If no external_show_id, list shows and return them for selection
  if (!external_show_id) {
    const shows = await listShows(api_key)
    if (shows.length === 0) return errorResponse('No shows found on this Transistor account', 404)
    if (shows.length === 1) {
      // Auto-select single show
      const { data, error: dbError } = await supabase!
        .from('distribution_connections')
        .upsert({
          show_id: showId,
          provider: 'transistor',
          api_key_enc: encrypt(api_key),
          external_show_id: shows[0].id,
          external_show_name: shows[0].name,
        }, { onConflict: 'show_id,provider' })
        .select()
        .single()
      if (dbError) return errorResponse(dbError.message, 500)
      return jsonResponse(data, 201)
    }
    // Multiple shows — return list for user to pick
    return jsonResponse({ needs_selection: true, shows })
  }

  // User selected a show — save connection
  const shows = await listShows(api_key)
  const selected = shows.find((s) => s.id === external_show_id)

  const { data, error: dbError } = await supabase!
    .from('distribution_connections')
    .upsert({
      show_id: showId,
      provider: 'transistor',
      api_key_enc: encrypt(api_key),
      external_show_id,
      external_show_name: selected?.name || null,
    }, { onConflict: 'show_id,provider' })
    .select()
    .single()

  if (dbError) return errorResponse(dbError.message, 500)
  return jsonResponse(data, 201)
}
```

**Step 3: Verify build**

Run: `npx next build 2>&1 | grep -E "(error|Error|✓)"`

**Step 4: Commit**

```bash
git add src/app/api/v1/shows/\[showId\]/distribution/route.ts src/app/api/v1/shows/\[showId\]/distribution/connect/route.ts
git commit -m "feat: add distribution connection API routes

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Distribution Settings UI

**Files:**
- Create: `src/components/shows/distribution-settings.tsx`
- Modify: `src/app/app/shows/[showId]/edit/page.tsx` — add distribution section below the form

**Step 1: Create the DistributionSettings component**

A client component that handles connecting/disconnecting Transistor.

```tsx
// src/components/shows/distribution-settings.tsx
'use client'

import { useState, useEffect } from 'react'

interface TransistorShow {
  id: string
  name: string
}

interface Connection {
  id: string
  provider: string
  external_show_id: string
  external_show_name: string | null
}

export function DistributionSettings({ showId }: { showId: string }) {
  const [connection, setConnection] = useState<Connection | null>(null)
  const [loading, setLoading] = useState(true)
  const [apiKey, setApiKey] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [showPicker, setShowPicker] = useState<TransistorShow[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/v1/shows/${showId}/distribution`)
      .then((r) => r.json())
      .then((json) => setConnection(json.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [showId])

  async function handleConnect() {
    setError(null)
    setConnecting(true)
    try {
      const res = await fetch(`/api/v1/shows/${showId}/distribution/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'transistor', api_key: apiKey }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error); return }
      if (json.data?.needs_selection) {
        setShowPicker(json.data.shows)
      } else {
        setConnection(json.data)
        setApiKey('')
      }
    } catch { setError('Connection failed') }
    finally { setConnecting(false) }
  }

  async function handleSelectShow(externalShowId: string) {
    setConnecting(true)
    try {
      const res = await fetch(`/api/v1/shows/${showId}/distribution/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'transistor', api_key: apiKey, external_show_id: externalShowId }),
      })
      const json = await res.json()
      if (res.ok) {
        setConnection(json.data)
        setShowPicker(null)
        setApiKey('')
      }
    } catch { setError('Connection failed') }
    finally { setConnecting(false) }
  }

  async function handleDisconnect() {
    await fetch(`/api/v1/shows/${showId}/distribution`, { method: 'DELETE' })
    setConnection(null)
  }

  if (loading) return null

  return (
    <div className="rounded-lg border border-border-subtle bg-surface-raised p-5">
      <h3 className="text-xs font-medium uppercase tracking-wider text-text-tertiary">Distribution</h3>

      {connection ? (
        <div className="mt-3 flex items-center justify-between">
          <div>
            <p className="text-sm text-text-primary font-medium">Transistor.fm</p>
            <p className="text-xs text-text-tertiary mt-0.5">{connection.external_show_name || connection.external_show_id}</p>
          </div>
          <button
            onClick={handleDisconnect}
            className="text-xs text-red-400 hover:text-red-300 transition-colors"
          >
            Disconnect
          </button>
        </div>
      ) : showPicker ? (
        <div className="mt-3 space-y-2">
          <p className="text-xs text-text-secondary">Select a Transistor show to link:</p>
          {showPicker.map((s) => (
            <button
              key={s.id}
              onClick={() => handleSelectShow(s.id)}
              disabled={connecting}
              className="block w-full text-left rounded-md border border-border-subtle bg-surface-overlay px-3 py-2 text-sm text-text-primary hover:border-border-default transition-colors disabled:opacity-50"
            >
              {s.name}
            </button>
          ))}
          <button onClick={() => { setShowPicker(null); setApiKey('') }} className="text-xs text-text-tertiary hover:text-text-secondary">
            Cancel
          </button>
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          <p className="text-xs text-text-secondary">Connect to Transistor.fm to publish episodes directly.</p>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex gap-2">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Transistor API key"
              className="flex-1 rounded-md border border-border-default bg-surface-input px-3 py-1.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
            />
            <button
              onClick={handleConnect}
              disabled={!apiKey.trim() || connecting}
              className="shrink-0 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
            >
              {connecting ? 'Connecting...' : 'Connect'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
```

**Step 2: Add to show edit page**

In `src/app/app/shows/[showId]/edit/page.tsx`, after the `ShowForm` closing tag (around line 113), add:

```tsx
import { DistributionSettings } from '@/components/shows/distribution-settings'

// ... inside the return, after ShowForm:
<div className="mt-8">
  <DistributionSettings showId={showId} />
</div>
```

Add the import at the top of the file.

**Step 3: Verify build**

Run: `npx next build 2>&1 | grep -E "(error|Error|✓)"`

**Step 4: Commit**

```bash
git add src/components/shows/distribution-settings.tsx src/app/app/shows/\[showId\]/edit/page.tsx
git commit -m "feat: add distribution settings UI for Transistor connection

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Publish API Route

**Files:**
- Create: `src/app/api/v1/shows/[showId]/episodes/[episodeId]/publish/route.ts`

**Step 1: Create the publish orchestrator**

This is the main publishing endpoint. It downloads audio from the delivery provider, uploads to Transistor, creates the episode, and publishes/schedules it.

```tsx
import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'
import { decrypt } from '@/lib/integrations/crypto'
import { getValidToken, getIntegrationAccountId } from '@/lib/integrations/token-refresh'
import { ensureProvidersRegistered } from '@/lib/integrations/init'
import { authorizeUpload, createEpisode, publishEpisode } from '@/lib/integrations/providers/transistor'

const FRAMEIO_API = 'https://api.frame.io/v4'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ showId: string; episodeId: string }> }
) {
  const { showId, episodeId } = await params
  const { supabase, user, error } = await getAuthenticatedClient()
  if (error) return error

  const body = await request.json()
  const { title, description, episode_number, season_number, episode_type, scheduled_at, audio_source } = body

  if (!title) return errorResponse('Title is required')
  if (!audio_source) return errorResponse('Audio source is required')

  // 1. Get distribution connection
  const { data: connection } = await supabase!
    .from('distribution_connections')
    .select('*')
    .eq('show_id', showId)
    .eq('provider', 'transistor')
    .single()

  if (!connection) return errorResponse('No Transistor connection for this show. Connect in show settings.', 404)

  const apiKey = decrypt(connection.api_key_enc)

  // 2. Resolve audio URL
  let audioUrl: string
  let audioFilename = 'episode.mp3'

  if (audio_source.startsWith('deliverable:')) {
    const deliverableId = audio_source.replace('deliverable:', '')

    // Get file reference for this deliverable
    const { data: fileRef } = await supabase!
      .from('file_references')
      .select('id, external_id, provider, name, mime_type')
      .eq('deliverable_id', deliverableId)
      .eq('provider', 'frame_io')
      .maybeSingle()

    if (!fileRef?.external_id) return errorResponse('No Frame.io file found for this deliverable', 404)

    audioFilename = fileRef.name || 'episode.mp3'

    // Get download URL from Frame.io
    ensureProvidersRegistered()
    const token = await getValidToken(user!.id, 'frame_io')
    const accountId = await getIntegrationAccountId(user!.id, 'frame_io')

    const frameRes = await fetch(
      `${FRAMEIO_API}/accounts/${accountId}/files/${fileRef.external_id}?include=media_links.original`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    if (!frameRes.ok) return errorResponse('Failed to get download URL from Frame.io', 502)

    const frameJson = await frameRes.json()
    const fileData = frameJson.data || frameJson
    const downloadUrl = fileData.media_links?.original?.url

    if (!downloadUrl) return errorResponse('No download URL available from Frame.io', 502)

    // Download the audio file
    const audioRes = await fetch(downloadUrl)
    if (!audioRes.ok) return errorResponse('Failed to download audio from Frame.io', 502)
    const audioBuffer = await audioRes.arrayBuffer()

    // Upload to Transistor
    const upload = await authorizeUpload(apiKey, audioFilename)
    const uploadRes = await fetch(upload.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': upload.contentType },
      body: audioBuffer,
    })
    if (!uploadRes.ok) return errorResponse('Failed to upload audio to Transistor', 502)

    audioUrl = upload.audioUrl

  } else if (audio_source.startsWith('url:')) {
    audioUrl = audio_source.replace('url:', '')
  } else {
    return errorResponse('Invalid audio_source format. Use "deliverable:{id}" or "url:{url}"')
  }

  // 3. Create episode on Transistor
  const transistorEpisode = await createEpisode(apiKey, {
    showId: connection.external_show_id,
    title,
    description,
    episodeNumber: episode_number,
    seasonNumber: season_number,
    episodeType: episode_type || 'full',
    audioUrl,
  })

  // 4. Publish or schedule
  const publishStatus = scheduled_at ? 'scheduled' : 'published'
  const publishResult = await publishEpisode(apiKey, transistorEpisode.id, {
    status: publishStatus as 'published' | 'scheduled',
    publishedAt: scheduled_at || undefined,
  })

  // 5. Update PreRoll episode
  const distributionMeta = {
    transistor_episode_id: transistorEpisode.id,
    media_url: publishResult.media_url || transistorEpisode.attributes.media_url,
    share_url: publishResult.share_url || transistorEpisode.attributes.share_url,
  }

  await supabase!
    .from('episodes')
    .update({
      distribution_status: publishStatus,
      distribution_external_id: transistorEpisode.id,
      distribution_published_at: scheduled_at || new Date().toISOString(),
      distribution_metadata: distributionMeta,
    })
    .eq('id', episodeId)

  // 6. Log activity
  const { data: episode } = await supabase!.from('episodes').select('show_id, title').eq('id', episodeId).single()
  if (episode) {
    const desc = scheduled_at
      ? `'${episode.title}' scheduled on Transistor for ${new Date(scheduled_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
      : `'${episode.title}' published to Transistor`
    await supabase!.from('activity_log').insert({
      show_id: episode.show_id,
      episode_id: episodeId,
      action: scheduled_at ? 'episode_scheduled' : 'episode_published',
      description: desc,
      metadata: { provider: 'transistor', transistor_episode_id: transistorEpisode.id },
    })
  }

  return jsonResponse({
    transistor_episode_id: transistorEpisode.id,
    status: publishStatus,
    media_url: distributionMeta.media_url,
    share_url: distributionMeta.share_url,
  }, 201)
}
```

**Step 2: Verify build**

Run: `npx next build 2>&1 | grep -E "(error|Error|✓)"`

**Step 3: Commit**

```bash
git add src/app/api/v1/shows/\[showId\]/episodes/\[episodeId\]/publish/route.ts
git commit -m "feat: add publish API route for Transistor episode publishing

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Publish Dialog Component

**Files:**
- Create: `src/components/episodes/publish-dialog.tsx`
- Modify: `src/app/app/shows/[showId]/episodes/[episodeId]/page.tsx` — add Publish button and dialog

**Step 1: Create the PublishDialog component**

A client component modal with metadata form and publish/schedule controls.

The component receives: `showId`, `episodeId`, `episode` (with title, episode_number, description, scheduled_publish_date), `deliverables` (list with id, title, type for audio source selector), `isOpen`, `onClose`.

**Form fields:**
- Audio source: dropdown of deliverables + "Custom URL" option
- Title (pre-filled, editable)
- Description (textarea, pre-filled from episode.description)
- Episode number (pre-filled, editable)
- Season number (optional)
- Episode type: select with full/trailer/bonus
- Publish mode: toggle between "Publish Now" and "Schedule"
- If scheduling: date input (pre-filled from scheduled_publish_date) + time input
- Submit button: "Publish to Transistor" or "Schedule on Transistor"
- Loading state during publish
- Error display
- Success state with share URL link

On submit: POST to `/api/v1/shows/${showId}/episodes/${episodeId}/publish` with all fields. On success, close and refresh.

**Style:** Modal overlay with dark backdrop, centered panel using existing design tokens. Max width `max-w-lg`.

**Step 2: Add to episode detail page**

In `src/app/app/shows/[showId]/episodes/[episodeId]/page.tsx`:
1. Also fetch `distribution_connections` for the show in the `Promise.all`
2. Pass `hasDistribution` boolean to a new "Publish" button in the header actions
3. Render `PublishDialog` with the episode and deliverables data

The Publish button should appear next to the existing Edit button when a distribution connection exists.

**Step 3: Verify build**

Run: `npx next build 2>&1 | grep -E "(error|Error|✓)"`

**Step 4: Commit**

```bash
git add src/components/episodes/publish-dialog.tsx src/app/app/shows/\[showId\]/episodes/\[episodeId\]/page.tsx
git commit -m "feat: add publish dialog for Transistor episode publishing

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Episode Distribution Status Indicator

**Files:**
- Modify: `src/app/app/shows/[showId]/episodes/[episodeId]/page.tsx` — show distribution status
- Modify: `src/components/episodes/episode-card.tsx` — show status on kanban cards

**Step 1: Add status to the episode detail page**

In the episode detail header area (where stage badge is shown), add a distribution status indicator:

```tsx
{episode.distribution_status === 'published' && (
  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 text-emerald-400 px-2 py-0.5 text-xs font-medium">
    Published
  </span>
)}
{episode.distribution_status === 'scheduled' && (
  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 text-amber-400 px-2 py-0.5 text-xs font-medium">
    Scheduled
  </span>
)}
```

If `distribution_metadata` has a `share_url`, show a link to it.

**Step 2: Add indicator to episode card**

In `src/components/episodes/episode-card.tsx`, the Episode interface needs `distribution_status?: string | null`. On the card, show a small icon or dot when published/scheduled.

The episode data passed to the card from `src/app/app/shows/[showId]/page.tsx` needs to include the new `distribution_status` column in its select query.

**Step 3: Verify build**

Run: `npx next build 2>&1 | grep -E "(error|Error|✓)"`

**Step 4: Commit**

```bash
git add src/app/app/shows/\[showId\]/episodes/\[episodeId\]/page.tsx src/components/episodes/episode-card.tsx src/app/app/shows/\[showId\]/page.tsx
git commit -m "feat: add distribution status indicators on episodes

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Test Full Flow

**No new files.** Verification only.

**Step 1: Verify build clean**

Run: `npx next build 2>&1 | grep -E "(error|Error|✓)"`

**Step 2: Check all routes registered**

Run: `npx next build 2>&1 | grep "distribution\|publish"`

Expect:
- `/api/v1/shows/[showId]/distribution`
- `/api/v1/shows/[showId]/distribution/connect`
- `/api/v1/shows/[showId]/episodes/[episodeId]/publish`

**Step 3: Verify database**

Check that `distribution_connections` table exists and `distribution_*` columns are on episodes:
```sql
SELECT column_name FROM information_schema.columns WHERE table_name = 'distribution_connections';
SELECT column_name FROM information_schema.columns WHERE table_name = 'episodes' AND column_name LIKE 'distribution%';
```

**Step 4: Manual test plan**

1. Go to a show's edit page → see Distribution section
2. Enter a Transistor API key → connect
3. If multiple Transistor shows, select one
4. Go to an episode detail page → see "Publish" button
5. Click Publish → select audio source → review metadata → publish
6. Check Transistor dashboard → verify episode appears
7. Test scheduling: set a future date → verify "Scheduled" status

**Step 5: Commit any fixes**

```bash
git add -A
git commit -m "fix: Transistor publishing polish from testing

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

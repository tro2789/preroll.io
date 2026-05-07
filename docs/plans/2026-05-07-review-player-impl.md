# Review Player Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an in-app video/audio review player with timecoded comments in the client portal, with bidirectional Frame.io comment sync.

**Architecture:** New `review_comments` table for local-first comments. Two new API routes (`/media` for signed playback URLs, `/comments` for CRUD + Frame.io sync). Custom HTML5 `<video>`/`<audio>` player component with comments sidebar. Dedicated review page at `/portal/shows/:showId/episodes/:episodeId/review/:deliverableId`. Producer's stored Frame.io token used server-side for all API calls.

**Tech Stack:** Next.js App Router, Supabase (Postgres + RLS), Frame.io V4 API, HTML5 Media API, Tailwind v4 design tokens.

---

## Reference: Key Files

- **Frame.io client:** `src/lib/integrations/providers/frame-io.ts` — `frameioFetch(path, token, options)` helper, `FrameIoClient` class
- **Token refresh:** `src/lib/integrations/token-refresh.ts` — `getValidToken(userId, provider)`, `getIntegrationAccountId(userId, provider)`
- **API helpers:** `src/lib/api/helpers.ts` — `getAuthenticatedClient()`, `jsonResponse()`, `errorResponse()`
- **Webhook route:** `src/app/api/v1/webhooks/[provider]/route.ts` — existing handler for `comment.created`, `file.updated`, etc.
- **Deliverable API:** `src/app/api/v1/deliverables/[deliverableId]/route.ts` — existing GET/PATCH
- **Portal episode detail:** `src/app/portal/shows/[showId]/episodes/[episodeId]/page.tsx`
- **DeliverableCard:** `src/components/portal/deliverable-card.tsx` — client component with approve/revise
- **Design doc:** `docs/plans/2026-05-07-review-player.md`

## Reference: Database Schema

**Ownership chain** (deliverable → producer token):
`deliverables.show_id` → `shows.client_id` → `clients.user_id` (producer) → `user_integrations` (where user_id = producer AND provider = 'frame_io') → token + account_id

**`file_references`**: `id`, `user_id`, `provider` (enum), `external_id` (Frame.io file ID), `external_url`, `name`, `thumbnail_url`, `mime_type`, `file_size`, `duration_seconds`, `provider_metadata` (jsonb), `episode_id`, `deliverable_id`, `created_at`, `updated_at`

**`user_integrations`**: `id`, `user_id`, `provider`, `access_token_enc`, `refresh_token_enc`, `token_expires_at`, `account_id`, `workspace_id`, ...

## Reference: Frame.io V4 API

- ALL requests wrap body in `{ data: {...} }`, ALL responses wrap in `{ data: {...} }` or `{ data: [...] }`
- **Get file with media links:** `GET /v4/accounts/{accountId}/files/{fileId}?include=media_links.high_quality,media_links.efficient`
  - Returns `data.media_links.high_quality.url` (signed S3 URL, expires — never cache)
  - Returns `data.status` — must be `ready` for media_links to exist
- **Create comment:** `POST /v4/accounts/{accountId}/files/{fileId}/comments` with `{ data: { text, timestamp } }`
  - `timestamp`: `HH:MM:SS:FF` format or integer frame number
  - Returns created comment with `id`, `text`, `timestamp`, `owner`, etc.
  - Rate limit: 100 calls/min per account user
- **List comments:** `GET /v4/accounts/{accountId}/files/{fileId}/comments?include=owner&page_size=50`
  - Returns `data: [...]` with pagination via `links.next`
  - Each comment has `id`, `text`, `timestamp`, `owner.name`, `created_at`

---

## Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/011_review_comments.sql`

**Step 1: Write the migration**

```sql
-- Review comments for the client portal video/audio player
CREATE TABLE review_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deliverable_id uuid REFERENCES deliverables(id) ON DELETE CASCADE NOT NULL,
  file_reference_id uuid REFERENCES file_references(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name text NOT NULL,
  text text NOT NULL,
  timestamp_secs double precision,
  external_id text,
  synced_at timestamptz,
  is_external boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_review_comments_deliverable ON review_comments(deliverable_id);
CREATE INDEX idx_review_comments_external ON review_comments(external_id) WHERE external_id IS NOT NULL;

-- RLS
ALTER TABLE review_comments ENABLE ROW LEVEL SECURITY;

-- Producer: full access via ownership chain
CREATE POLICY review_comments_producer ON review_comments FOR ALL
  USING (deliverable_id IN (
    SELECT d.id FROM deliverables d
    JOIN shows s ON d.show_id = s.id
    JOIN clients c ON s.client_id = c.id
    WHERE c.user_id = auth.uid()
  ));

-- Client: read all comments on their deliverables
CREATE POLICY review_comments_client_read ON review_comments FOR SELECT
  USING (deliverable_id IN (
    SELECT d.id FROM deliverables d
    JOIN shows s ON d.show_id = s.id
    JOIN clients c ON s.client_id = c.id
    WHERE c.client_user_id = auth.uid()
  ));

-- Client: insert their own comments
CREATE POLICY review_comments_client_insert ON review_comments FOR INSERT
  WITH CHECK (deliverable_id IN (
    SELECT d.id FROM deliverables d
    JOIN shows s ON d.show_id = s.id
    JOIN clients c ON s.client_id = c.id
    WHERE c.client_user_id = auth.uid()
  ) AND user_id = auth.uid());
```

**Step 2: Apply the migration**

Use the Supabase MCP tool `apply_migration` with name `011_review_comments` and the SQL above.

**Step 3: Commit**

```bash
git add supabase/migrations/011_review_comments.sql
git commit -m "feat: add review_comments table with RLS policies

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Media URL API Route

**Files:**
- Create: `src/app/api/v1/deliverables/[deliverableId]/media/route.ts`

**Step 1: Create the route**

This endpoint fetches a signed playback URL from Frame.io for a deliverable's linked file. Uses the producer's stored token.

```tsx
import { NextRequest } from 'next/server'
import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'
import { getValidToken, getIntegrationAccountId } from '@/lib/integrations/token-refresh'
import { ensureProvidersRegistered } from '@/lib/integrations/init'

const FRAMEIO_API = 'https://api.frame.io/v4'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ deliverableId: string }> }
) {
  const { deliverableId } = await params
  const { supabase, error } = await getAuthenticatedClient()
  if (error) return error

  // Get deliverable + file reference + producer user_id
  const { data: deliverable, error: dbError } = await supabase!
    .from('deliverables')
    .select('id, show_id, shows(client_id, clients(user_id))')
    .eq('id', deliverableId)
    .single()

  if (dbError || !deliverable) return errorResponse('Deliverable not found', 404)

  const client = (deliverable.shows as any)?.clients as { user_id: string } | null
  if (!client?.user_id) return errorResponse('No producer found', 404)

  // Get file reference linked to this deliverable
  const { data: fileRef } = await supabase!
    .from('file_references')
    .select('id, external_id, provider, mime_type, duration_seconds')
    .eq('deliverable_id', deliverableId)
    .eq('provider', 'frame_io')
    .limit(1)
    .single()

  if (!fileRef?.external_id) return errorResponse('No Frame.io file linked to this deliverable', 404)

  // Get producer's Frame.io token and account ID
  ensureProvidersRegistered()
  let accessToken: string
  let accountId: string
  try {
    accessToken = await getValidToken(client.user_id, 'frame_io')
    accountId = await getIntegrationAccountId(client.user_id, 'frame_io')
  } catch {
    return errorResponse('Frame.io integration not connected', 502)
  }

  // Fetch media links from Frame.io
  const res = await fetch(
    `${FRAMEIO_API}/accounts/${accountId}/files/${fileRef.external_id}?include=media_links.high_quality,media_links.efficient`,
    { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
  )

  if (!res.ok) return errorResponse('Failed to fetch media from Frame.io', 502)

  const json = await res.json()
  const fileData = json.data || json

  if (fileData.status !== 'ready') {
    return jsonResponse({ status: 'processing', mime_type: fileRef.mime_type })
  }

  const mediaLinks = fileData.media_links || {}
  const highQuality = mediaLinks.high_quality
  const efficient = mediaLinks.efficient
  const playbackUrl = highQuality?.url || efficient?.url || null

  if (!playbackUrl) return errorResponse('No playback URL available', 404)

  return jsonResponse({
    url: playbackUrl,
    mime_type: fileRef.mime_type || fileData.media_type,
    duration_seconds: fileRef.duration_seconds || fileData.duration || null,
    status: 'ready',
    file_reference_id: fileRef.id,
  })
}
```

**Step 2: Verify build**

Run: `npx next build 2>&1 | grep -E "(error|Error|✓)"`

**Step 3: Commit**

```bash
git add src/app/api/v1/deliverables/\[deliverableId\]/media/route.ts
git commit -m "feat: add media URL API route for Frame.io playback

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Comments API Routes

**Files:**
- Create: `src/app/api/v1/deliverables/[deliverableId]/comments/route.ts`

**Step 1: Create the route with GET and POST**

```tsx
import { NextRequest } from 'next/server'
import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'
import { getValidToken, getIntegrationAccountId } from '@/lib/integrations/token-refresh'
import { ensureProvidersRegistered } from '@/lib/integrations/init'

const FRAMEIO_API = 'https://api.frame.io/v4'

// Helper: convert seconds to HH:MM:SS:00 for Frame.io
function secsToTimecode(secs: number): string {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = Math.floor(secs % 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}:00`
}

// Helper: convert Frame.io timecode (HH:MM:SS:FF or frame int) to seconds
function timecodeToSecs(tc: string | number | null): number | null {
  if (tc == null) return null
  if (typeof tc === 'number') return tc / 24 // assume 24fps for frame numbers
  const parts = tc.split(':').map(Number)
  if (parts.length >= 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2] + (parts[3] || 0) / 24
  }
  return null
}

// Helper: get Frame.io file info for a deliverable
async function getFrameIoContext(supabase: any, deliverableId: string) {
  const { data: deliverable } = await supabase
    .from('deliverables')
    .select('id, show_id, shows(client_id, clients(user_id))')
    .eq('id', deliverableId)
    .single()

  if (!deliverable) return null

  const client = (deliverable.shows as any)?.clients as { user_id: string } | null
  if (!client?.user_id) return null

  const { data: fileRef } = await supabase
    .from('file_references')
    .select('id, external_id, provider')
    .eq('deliverable_id', deliverableId)
    .eq('provider', 'frame_io')
    .limit(1)
    .single()

  if (!fileRef?.external_id) return null

  ensureProvidersRegistered()
  try {
    const accessToken = await getValidToken(client.user_id, 'frame_io')
    const accountId = await getIntegrationAccountId(client.user_id, 'frame_io')
    return { fileRef, accessToken, accountId, producerUserId: client.user_id }
  } catch {
    return null
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ deliverableId: string }> }
) {
  const { deliverableId } = await params
  const { supabase, error } = await getAuthenticatedClient()
  if (error) return error

  // Fetch local comments
  const { data: localComments } = await supabase!
    .from('review_comments')
    .select('*')
    .eq('deliverable_id', deliverableId)
    .order('timestamp_secs', { ascending: true, nullsFirst: true })
    .order('created_at', { ascending: true })

  const comments = localComments || []

  // Try to sync from Frame.io (merge any missing external comments)
  const ctx = await getFrameIoContext(supabase!, deliverableId)
  if (ctx) {
    try {
      const res = await fetch(
        `${FRAMEIO_API}/accounts/${ctx.accountId}/files/${ctx.fileRef.external_id}/comments?include=owner&page_size=100`,
        { headers: { Authorization: `Bearer ${ctx.accessToken}` } }
      )
      if (res.ok) {
        const json = await res.json()
        const frameComments = json.data || []
        const existingExternalIds = new Set(comments.filter((c: any) => c.external_id).map((c: any) => c.external_id))

        for (const fc of frameComments) {
          if (!existingExternalIds.has(fc.id)) {
            const ownerName = fc.owner?.name || fc.owner?.email || 'Editor'
            const timestampSecs = timecodeToSecs(fc.timestamp)
            const { data: inserted } = await supabase!
              .from('review_comments')
              .insert({
                deliverable_id: deliverableId,
                file_reference_id: ctx.fileRef.id,
                author_name: ownerName,
                text: fc.text,
                timestamp_secs: timestampSecs,
                external_id: fc.id,
                synced_at: new Date().toISOString(),
                is_external: true,
              })
              .select()
              .single()
            if (inserted) comments.push(inserted)
          }
        }

        // Re-sort after merge
        comments.sort((a: any, b: any) => {
          const ta = a.timestamp_secs ?? -1
          const tb = b.timestamp_secs ?? -1
          if (ta !== tb) return ta - tb
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        })
      }
    } catch {
      // Frame.io sync failed — return local comments only
    }
  }

  return jsonResponse(comments)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ deliverableId: string }> }
) {
  const { deliverableId } = await params
  const { supabase, user, error } = await getAuthenticatedClient()
  if (error) return error

  const body = await request.json()
  const { text, timestamp_secs } = body

  if (!text?.trim()) return errorResponse('Comment text is required')

  // Get the commenter's name (try client record first, fall back to email)
  const { data: clientRecord } = await supabase!
    .from('clients')
    .select('name')
    .eq('client_user_id', user!.id)
    .limit(1)
    .single()

  const authorName = clientRecord?.name || user!.email || 'Client'

  // Get file reference for this deliverable
  const { data: fileRef } = await supabase!
    .from('file_references')
    .select('id, external_id, provider')
    .eq('deliverable_id', deliverableId)
    .eq('provider', 'frame_io')
    .limit(1)
    .single()

  // Insert locally
  const { data: comment, error: insertError } = await supabase!
    .from('review_comments')
    .insert({
      deliverable_id: deliverableId,
      file_reference_id: fileRef?.id || null,
      user_id: user!.id,
      author_name: authorName,
      text: text.trim(),
      timestamp_secs: timestamp_secs ?? null,
      is_external: false,
    })
    .select()
    .single()

  if (insertError) return errorResponse(insertError.message, 500)

  // Push to Frame.io async (same request, but don't block on failure)
  if (fileRef?.external_id) {
    const ctx = await getFrameIoContext(supabase!, deliverableId)
    if (ctx) {
      try {
        const frameBody: Record<string, unknown> = { text: text.trim() }
        if (timestamp_secs != null) {
          frameBody.timestamp = secsToTimecode(timestamp_secs)
        }
        const res = await fetch(
          `${FRAMEIO_API}/accounts/${ctx.accountId}/files/${ctx.fileRef.external_id}/comments`,
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${ctx.accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: frameBody }),
          }
        )
        if (res.ok) {
          const json = await res.json()
          const frameComment = json.data || json
          await supabase!
            .from('review_comments')
            .update({ external_id: frameComment.id, synced_at: new Date().toISOString() })
            .eq('id', comment.id)
        }
      } catch {
        // Frame.io push failed — comment exists locally, that's fine
      }
    }
  }

  return jsonResponse(comment, 201)
}
```

**Step 2: Verify build**

Run: `npx next build 2>&1 | grep -E "(error|Error|✓)"`

**Step 3: Commit**

```bash
git add src/app/api/v1/deliverables/\[deliverableId\]/comments/route.ts
git commit -m "feat: add comments API with Frame.io bidirectional sync

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Webhook Handler for comment.created

**Files:**
- Modify: `src/app/api/v1/webhooks/[provider]/route.ts`

**Step 1: Extend the comment.created handler**

The existing handler at line 88-101 already handles `comment.created` by incrementing comment count on `file_references`. Add code to also insert into `review_comments`.

After the existing `comment.created` block (around line 101), and still inside the `if (eventType === 'comment.created' && episode)` block, add:

```tsx
    // Also insert into review_comments for the portal review player
    const commentData = payload.resource as Record<string, unknown>
    const commentId = commentData?.id as string | undefined
    const commentText = commentData?.text as string | undefined

    if (commentId && commentText) {
      // Check if this comment already exists (e.g., pushed from PreRoll)
      const { data: existingComment } = await supabase
        .from('review_comments')
        .select('id')
        .eq('external_id', commentId)
        .limit(1)
        .single()

      if (!existingComment) {
        // Find the deliverable linked to this file_reference
        const { data: deliverableRef } = await supabase
          .from('file_references')
          .select('deliverable_id')
          .eq('id', fileRef.id)
          .single()

        if (deliverableRef?.deliverable_id) {
          const ownerData = commentData.owner as Record<string, unknown> | undefined
          const authorName = (ownerData?.name as string) || (ownerData?.email as string) || 'Editor'

          // Convert timestamp
          const rawTimestamp = commentData.timestamp as string | number | null
          let timestampSecs: number | null = null
          if (rawTimestamp != null) {
            if (typeof rawTimestamp === 'number') {
              timestampSecs = rawTimestamp / 24
            } else if (typeof rawTimestamp === 'string') {
              const parts = rawTimestamp.split(':').map(Number)
              if (parts.length >= 3) {
                timestampSecs = parts[0] * 3600 + parts[1] * 60 + parts[2] + (parts[3] || 0) / 24
              }
            }
          }

          await supabase.from('review_comments').insert({
            deliverable_id: deliverableRef.deliverable_id,
            file_reference_id: fileRef.id,
            author_name: authorName,
            text: commentText,
            timestamp_secs: timestampSecs,
            external_id: commentId,
            synced_at: new Date().toISOString(),
            is_external: true,
          })
        }
      }
    }
```

**Step 2: Verify build**

Run: `npx next build 2>&1 | grep -E "(error|Error|✓)"`

**Step 3: Commit**

```bash
git add src/app/api/v1/webhooks/\[provider\]/route.ts
git commit -m "feat: sync Frame.io webhook comments into review_comments table

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: ReviewPlayer Component

**Files:**
- Create: `src/components/portal/review-player.tsx`

**Step 1: Create the player component**

A client component with custom HTML5 video/audio controls. Exposes current playhead position via callback.

```tsx
// src/components/portal/review-player.tsx
'use client'

import { useRef, useState, useEffect, useCallback } from 'react'

interface ReviewPlayerProps {
  src: string
  mimeType: string
  duration?: number | null
  thumbnailUrl?: string | null
  onTimeUpdate?: (seconds: number) => void
  onRefreshNeeded?: () => Promise<string | null>
}

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export function ReviewPlayer({ src, mimeType, duration, thumbnailUrl, onTimeUpdate, onRefreshNeeded }: ReviewPlayerProps) {
  const isVideo = mimeType?.startsWith('video/')
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [mediaDuration, setMediaDuration] = useState(duration || 0)
  const [volume, setVolume] = useState(1)
  const [seeking, setSeeking] = useState(false)

  const handleTimeUpdate = useCallback(() => {
    if (mediaRef.current && !seeking) {
      const t = mediaRef.current.currentTime
      setCurrentTime(t)
      onTimeUpdate?.(t)
    }
  }, [seeking, onTimeUpdate])

  const handleLoadedMetadata = useCallback(() => {
    if (mediaRef.current) {
      setMediaDuration(mediaRef.current.duration)
    }
  }, [])

  const handleError = useCallback(async () => {
    if (onRefreshNeeded) {
      const newSrc = await onRefreshNeeded()
      if (newSrc && mediaRef.current) {
        const wasPlaying = !mediaRef.current.paused
        const pos = mediaRef.current.currentTime
        mediaRef.current.src = newSrc
        mediaRef.current.currentTime = pos
        if (wasPlaying) mediaRef.current.play()
      }
    }
  }, [onRefreshNeeded])

  function togglePlay() {
    if (!mediaRef.current) return
    if (mediaRef.current.paused) {
      mediaRef.current.play()
      setPlaying(true)
    } else {
      mediaRef.current.pause()
      setPlaying(false)
    }
  }

  function handleSeek(e: React.MouseEvent<HTMLDivElement>) {
    if (!mediaRef.current || !mediaDuration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const newTime = pct * mediaDuration
    mediaRef.current.currentTime = newTime
    setCurrentTime(newTime)
    onTimeUpdate?.(newTime)
  }

  function handleVolumeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = parseFloat(e.target.value)
    setVolume(v)
    if (mediaRef.current) mediaRef.current.volume = v
  }

  function seekTo(seconds: number) {
    if (mediaRef.current) {
      mediaRef.current.currentTime = seconds
      setCurrentTime(seconds)
    }
  }

  useEffect(() => {
    const el = mediaRef.current
    if (!el) return
    el.addEventListener('timeupdate', handleTimeUpdate)
    el.addEventListener('loadedmetadata', handleLoadedMetadata)
    el.addEventListener('error', handleError)
    el.addEventListener('ended', () => setPlaying(false))
    return () => {
      el.removeEventListener('timeupdate', handleTimeUpdate)
      el.removeEventListener('loadedmetadata', handleLoadedMetadata)
      el.removeEventListener('error', handleError)
    }
  }, [handleTimeUpdate, handleLoadedMetadata, handleError])

  const progress = mediaDuration > 0 ? (currentTime / mediaDuration) * 100 : 0

  return (
    <div className="flex flex-col">
      {/* Media element */}
      {isVideo ? (
        <video
          ref={mediaRef as React.RefObject<HTMLVideoElement>}
          src={src}
          className="w-full rounded-lg bg-black aspect-video"
          playsInline
          preload="metadata"
        />
      ) : (
        <div className="w-full rounded-lg bg-surface-raised border border-border-subtle flex items-center justify-center aspect-[3/1]"
          style={thumbnailUrl ? undefined : { background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
          {thumbnailUrl ? (
            <img src={thumbnailUrl} alt="" className="w-full h-full object-cover rounded-lg" />
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-16 w-16 text-white/30">
              <path fillRule="evenodd" d="M19.952 1.651a.75.75 0 01.298.599V16.303a3 3 0 01-2.176 2.884l-1.32.377a2.553 2.553 0 11-1.403-4.909l2.311-.66a1.5 1.5 0 001.088-1.442V6.994l-9 2.571v9.182a3 3 0 01-2.176 2.884l-1.32.377a2.553 2.553 0 11-1.402-4.909l2.31-.66a1.5 1.5 0 001.088-1.442V5.71a.75.75 0 01.544-.721l10.5-3a.75.75 0 01.658.162z" clipRule="evenodd" />
            </svg>
          )}
          <audio ref={mediaRef as React.RefObject<HTMLAudioElement>} src={src} preload="metadata" />
        </div>
      )}

      {/* Controls */}
      <div className="mt-3 space-y-2">
        {/* Progress bar */}
        <div
          className="h-1.5 bg-surface-overlay rounded-full cursor-pointer relative group"
          onClick={handleSeek}
        >
          <div
            className="absolute inset-y-0 left-0 bg-accent rounded-full transition-[width] duration-100"
            style={{ width: `${progress}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 h-3 w-3 bg-accent rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ left: `${progress}%`, transform: `translateX(-50%) translateY(-50%)` }}
          />
        </div>

        {/* Buttons row */}
        <div className="flex items-center gap-3">
          <button
            onClick={togglePlay}
            className="text-text-primary hover:text-accent transition-colors"
          >
            {playing ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
                <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
                <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
              </svg>
            )}
          </button>

          <span className="text-xs font-mono text-text-secondary tabular-nums">
            {formatTime(currentTime)} / {formatTime(mediaDuration)}
          </span>

          <div className="ml-auto flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 text-text-tertiary">
              <path d="M10.5 3.75a.75.75 0 00-1.264-.546L5.203 7H2.667a.75.75 0 00-.7.48A6.985 6.985 0 001.5 10c0 .887.165 1.737.468 2.52.111.29.39.48.7.48h2.535l4.033 3.796a.75.75 0 001.264-.546V3.75zM15.95 5.05a.75.75 0 00-1.06 1.061 5.5 5.5 0 010 7.778.75.75 0 001.06 1.06 7 7 0 000-9.899z" />
            </svg>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={handleVolumeChange}
              className="w-16 h-1 accent-accent"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
```

Expose `seekTo` via a ref or by passing the method up — the simplest approach is to expose `mediaRef` externally or use `useImperativeHandle`. For now, the parent page can call `seekTo` by passing a `seekToTime` prop that the player watches with `useEffect`.

Add this prop and effect to the component:

```tsx
// Add to props interface:
seekToTime?: number | null

// Add useEffect inside component:
useEffect(() => {
  if (seekToTime != null && mediaRef.current) {
    mediaRef.current.currentTime = seekToTime
    setCurrentTime(seekToTime)
  }
}, [seekToTime])
```

**Step 2: Verify build**

Run: `npx next build 2>&1 | grep -E "(error|Error|✓)"`

**Step 3: Commit**

```bash
git add src/components/portal/review-player.tsx
git commit -m "feat(portal): add ReviewPlayer component for video/audio playback

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: CommentsSidebar Component

**Files:**
- Create: `src/components/portal/comments-sidebar.tsx`

**Step 1: Create the sidebar component**

Client component with comment list and input form. Timestamps are clickable.

```tsx
// src/components/portal/comments-sidebar.tsx
'use client'

import { useState, useRef, useEffect } from 'react'

interface Comment {
  id: string
  author_name: string
  text: string
  timestamp_secs: number | null
  is_external: boolean
  created_at: string
}

interface CommentsSidebarProps {
  comments: Comment[]
  currentTime: number
  onSeek: (seconds: number) => void
  onSubmit: (text: string, timestampSecs: number) => Promise<void>
}

function formatTimecode(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function CommentsSidebar({ comments, currentTime, onSeek, onSubmit }: CommentsSidebarProps) {
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim() || submitting) return
    setSubmitting(true)
    await onSubmit(text.trim(), currentTime)
    setText('')
    setSubmitting(false)
  }

  // Separate general (no timestamp) from timed comments
  const generalComments = comments.filter((c) => c.timestamp_secs == null)
  const timedComments = comments.filter((c) => c.timestamp_secs != null)

  return (
    <div className="flex flex-col h-full">
      {/* Comment list */}
      <div ref={listRef} className="flex-1 overflow-y-auto space-y-1 pr-1">
        {generalComments.length > 0 && (
          <div className="mb-3">
            <p className="text-[10px] uppercase tracking-wider text-text-tertiary mb-2">General</p>
            {generalComments.map((c) => (
              <CommentItem key={c.id} comment={c} currentTime={currentTime} onSeek={onSeek} />
            ))}
          </div>
        )}
        {timedComments.map((c) => (
          <CommentItem key={c.id} comment={c} currentTime={currentTime} onSeek={onSeek} />
        ))}
        {comments.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm text-text-tertiary">No comments yet</p>
            <p className="text-xs text-text-tertiary mt-1">Play the file and leave feedback at any point.</p>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="shrink-0 border-t border-border-subtle pt-3 mt-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] uppercase tracking-wider text-text-tertiary">Commenting at</span>
          <span className="text-xs font-mono bg-accent/15 text-accent px-1.5 py-0.5 rounded">
            {formatTimecode(currentTime)}
          </span>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Leave feedback..."
            disabled={submitting}
            className="flex-1 rounded-md border border-border-default bg-surface-input px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!text.trim() || submitting}
            className="shrink-0 rounded-md bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  )
}

function CommentItem({ comment, currentTime, onSeek }: { comment: Comment; currentTime: number; onSeek: (s: number) => void }) {
  const isActive = comment.timestamp_secs != null &&
    Math.abs(currentTime - comment.timestamp_secs) < 2

  return (
    <div className={`rounded-md px-3 py-2 transition-colors ${isActive ? 'bg-accent/10' : 'hover:bg-surface-overlay'}`}>
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-text-primary">{comment.author_name}</span>
        {comment.is_external && (
          <span className="text-[10px] bg-surface-overlay border border-border-subtle rounded px-1 py-px text-text-tertiary">
            Editor
          </span>
        )}
        {comment.timestamp_secs != null && (
          <button
            onClick={() => onSeek(comment.timestamp_secs!)}
            className="text-[11px] font-mono bg-surface-overlay border border-border-subtle rounded px-1.5 py-0.5 text-accent hover:bg-accent/10 transition-colors"
          >
            {formatTimecode(comment.timestamp_secs)}
          </button>
        )}
        <span className="ml-auto text-[10px] text-text-tertiary">{timeAgo(comment.created_at)}</span>
      </div>
      <p className="text-sm text-text-secondary mt-1">{comment.text}</p>
    </div>
  )
}
```

**Step 2: Verify build**

Run: `npx next build 2>&1 | grep -E "(error|Error|✓)"`

**Step 3: Commit**

```bash
git add src/components/portal/comments-sidebar.tsx
git commit -m "feat(portal): add CommentsSidebar with timecoded comments and input

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Review Page

**Files:**
- Create: `src/app/portal/shows/[showId]/episodes/[episodeId]/review/[deliverableId]/page.tsx`

**Step 1: Create the review page**

This is a client component page that orchestrates the player and comments sidebar. It fetches media URL and comments from the API routes.

```tsx
// src/app/portal/shows/[showId]/episodes/[episodeId]/review/[deliverableId]/page.tsx
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ReviewPlayer } from '@/components/portal/review-player'
import { CommentsSidebar } from '@/components/portal/comments-sidebar'

interface MediaInfo {
  url: string
  mime_type: string
  duration_seconds: number | null
  status: string
  file_reference_id: string
}

interface Comment {
  id: string
  author_name: string
  text: string
  timestamp_secs: number | null
  is_external: boolean
  created_at: string
}

export default function ReviewPage() {
  const params = useParams()
  const showId = params.showId as string
  const episodeId = params.episodeId as string
  const deliverableId = params.deliverableId as string

  const [media, setMedia] = useState<MediaInfo | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [deliverable, setDeliverable] = useState<{ title: string; type: string; file_url: string | null } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [seekToTime, setSeekToTime] = useState<number | null>(null)

  const fetchMedia = useCallback(async (): Promise<string | null> => {
    const res = await fetch(`/api/v1/deliverables/${deliverableId}/media`)
    if (!res.ok) return null
    const json = await res.json()
    const data = json.data
    if (data?.status === 'ready') {
      setMedia(data)
      return data.url
    }
    return null
  }, [deliverableId])

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        // Fetch deliverable info, media, and comments in parallel
        const [delRes, mediaRes, commentsRes] = await Promise.all([
          fetch(`/api/v1/deliverables/${deliverableId}`),
          fetch(`/api/v1/deliverables/${deliverableId}/media`),
          fetch(`/api/v1/deliverables/${deliverableId}/comments`),
        ])

        if (delRes.ok) {
          const dj = await delRes.json()
          setDeliverable(dj.data)
        }

        if (mediaRes.ok) {
          const mj = await mediaRes.json()
          if (mj.data?.status === 'processing') {
            setError('This file is still processing. Please check back shortly.')
          } else if (mj.data?.url) {
            setMedia(mj.data)
          } else {
            setError('No playable media found for this deliverable.')
          }
        } else {
          setError('Unable to load media. The file may not have a linked Frame.io asset.')
        }

        if (commentsRes.ok) {
          const cj = await commentsRes.json()
          setComments(cj.data || [])
        }
      } catch {
        setError('Failed to load review data.')
      }
      setLoading(false)
    }
    load()
  }, [deliverableId])

  async function handleCommentSubmit(text: string, timestampSecs: number) {
    const res = await fetch(`/api/v1/deliverables/${deliverableId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, timestamp_secs: timestampSecs }),
    })
    if (res.ok) {
      const json = await res.json()
      setComments((prev) => {
        const next = [...prev, json.data]
        next.sort((a, b) => {
          const ta = a.timestamp_secs ?? -1
          const tb = b.timestamp_secs ?? -1
          if (ta !== tb) return ta - tb
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        })
        return next
      })
    }
  }

  function handleSeek(seconds: number) {
    setSeekToTime(seconds)
    setTimeout(() => setSeekToTime(null), 100)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-text-tertiary">Loading review...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href={`/portal/shows/${showId}/episodes/${episodeId}`}
            className="text-xs text-text-tertiary hover:text-text-secondary transition-colors shrink-0"
          >
            &larr; Back
          </Link>
          {deliverable && (
            <h1 className="text-sm font-medium text-text-primary truncate">
              {deliverable.title}
            </h1>
          )}
        </div>
        {deliverable?.file_url && (
          <a
            href={deliverable.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded-md border border-border-subtle bg-surface-overlay px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary hover:border-border-default transition-colors"
          >
            Download
          </a>
        )}
      </div>

      {error ? (
        <div className="rounded-lg border border-border-subtle bg-surface-raised px-6 py-12 text-center">
          <p className="text-sm text-text-secondary">{error}</p>
        </div>
      ) : media ? (
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Player — 2/3 on desktop */}
          <div className="flex-1 lg:w-2/3">
            <ReviewPlayer
              src={media.url}
              mimeType={media.mime_type}
              duration={media.duration_seconds}
              seekToTime={seekToTime}
              onTimeUpdate={setCurrentTime}
              onRefreshNeeded={fetchMedia}
            />
          </div>

          {/* Comments — 1/3 on desktop */}
          <div className="lg:w-1/3 lg:min-h-[400px]">
            <CommentsSidebar
              comments={comments}
              currentTime={currentTime}
              onSeek={handleSeek}
              onSubmit={handleCommentSubmit}
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}
```

**Step 2: Verify build**

Run: `npx next build 2>&1 | grep -E "(error|Error|✓)"`

**Step 3: Commit**

```bash
git add "src/app/portal/shows/[showId]/episodes/[episodeId]/review/[deliverableId]/page.tsx"
git commit -m "feat(portal): add review page with player and comments sidebar

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Update DeliverableCard

**Files:**
- Modify: `src/components/portal/deliverable-card.tsx`

**Step 1: Add Review button for video/audio deliverables**

The DeliverableCard needs two new optional props:
- `reviewUrl?: string` — if set, shows a "Review" button linking to the review page
- `fileUrl?: string` — for the download link on non-reviewable files (already exists as `deliverable.file_url`)

Read the existing file. Add `reviewUrl` to the `DeliverableCardProps` interface. In the card's top-right area (where "View file" currently is), replace with conditional logic:

- If `reviewUrl` is set: show a "Review" link button (accent colored) pointing to the review page
- If no `reviewUrl` but `deliverable.file_url` exists: show "Download" link (current "View file" behavior)

The `reviewUrl` will be passed by the parent page, which determines it based on whether the deliverable has a linked file_reference with a video/audio mime_type.

Also update the episode detail page (`src/app/portal/shows/[showId]/episodes/[episodeId]/page.tsx`) to:
1. Fetch `file_references` for the episode's deliverables
2. For deliverables with video/audio file_references, pass `reviewUrl` to DeliverableCard

And update the show detail page's ReviewQueue: the review queue renders DeliverableCards for pending deliverables. The show page needs to also fetch file_references for pending deliverables and pass `reviewUrl` where applicable.

**Step 2: Verify build**

Run: `npx next build 2>&1 | grep -E "(error|Error|✓)"`

**Step 3: Commit**

```bash
git add src/components/portal/deliverable-card.tsx src/app/portal/shows/\[showId\]/episodes/\[episodeId\]/page.tsx src/app/portal/shows/\[showId\]/page.tsx src/components/portal/review-queue.tsx
git commit -m "feat(portal): add Review button on video/audio deliverables

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: Test Full Flow

**No new files.** Verification and fixes only.

**Step 1: Set up test data**

Ensure a deliverable exists that:
- Has a linked `file_reference` with provider `frame_io` and an `external_id`
- The file in Frame.io is a video or audio file with status `ready`
- The producer has a connected Frame.io integration

Check via Supabase: `SELECT d.id, d.title, fr.external_id, fr.mime_type, fr.provider FROM deliverables d LEFT JOIN file_references fr ON fr.deliverable_id = d.id WHERE fr.provider = 'frame_io'`

**Step 2: Test the media endpoint**

Visit `/api/v1/deliverables/{id}/media` (while authenticated). Verify it returns a signed URL.

**Step 3: Test the review page**

Navigate to `/portal/shows/{showId}/episodes/{episodeId}/review/{deliverableId}`. Verify:
- Player loads and plays video/audio
- Custom controls work (play/pause, seek, volume)
- Timecode displays correctly
- Download button links to file

**Step 4: Test comments**

On the review page:
- Pause at a specific timecode
- Type a comment and submit
- Verify it appears in the sidebar with the correct timecode
- Click the timecode badge on a comment — verify player jumps to that position
- Check Frame.io project — verify the comment appeared there with the correct timecode

**Step 5: Test incoming comments**

Leave a comment directly in Frame.io on the same file. Either:
- Wait for webhook to fire, or
- Refresh the review page (GET /comments does initial sync)
- Verify the Frame.io comment appears in the sidebar with "Editor" badge

**Step 6: Fix any issues**

Address layout, data, or sync issues found during testing.

**Step 7: Commit fixes**

```bash
git add -A
git commit -m "fix(portal): review player polish from testing

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

# Client Portal Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the client portal from barebones admin lists into a polished status-page experience with inline review actions, visual progress indicators, and show branding.

**Architecture:** Pure UI redesign — no schema changes. Three new presentational components (`PipelineProgress`, `ShowHero`, `ReviewQueue`), then rewire existing pages to use them. All data already exists in the database; we just need better queries and richer rendering.

**Tech Stack:** Next.js App Router (server components + client components), Supabase queries, Tailwind v4 with existing design tokens (`surface-*`, `text-*`, `border-*`, `accent`).

---

## Reference: Existing Code (read these before implementing)

- **Design doc:** `docs/plans/2026-05-06-portal-redesign.md`
- **Portal layout:** `src/app/portal/layout.tsx` — checks auth, fetches client name, renders `PortalHeader`
- **Show detail page:** `src/app/portal/shows/[showId]/page.tsx` — current implementation to replace
- **Dashboard page:** `src/app/portal/page.tsx` — current implementation to refresh
- **Episode detail page:** `src/app/portal/shows/[showId]/episodes/[episodeId]/page.tsx` — current implementation to update
- **DeliverableCard:** `src/components/portal/deliverable-card.tsx` — client component with approve/revise logic (reuse as-is, extend with episode context)
- **EpisodeTimeline:** `src/components/portal/episode-timeline.tsx` — current flat-row list (replacing)
- **ActivityFeed:** `src/components/portal/activity-feed.tsx` — keeping mostly as-is
- **Thumbnail:** `src/components/ui/thumbnail.tsx` — image with gradient fallback, `loading="lazy"`
- **R2 client:** `src/lib/r2/client.ts` — `resolveImageUrl()` converts R2 keys to public URLs (server-side only)
- **Gradient util:** `src/lib/ui/gradient.ts` — `getGradient(id)` for fallback backgrounds

## Reference: Database Schema

**`pipeline_stages`**: `id` (uuid), `show_id` (uuid), `name` (text), `position` (int), `status_override`, `wip_limit`

**`deliverables`**: `id`, `show_id`, `episode_id` (nullable), `type` (enum), `title`, `description`, `file_url`, `file_key`, `status` (enum: pending/approved/revision_requested), `reviewer_notes`, `reviewed_at`, `created_at`, `updated_at`

**`shows`**: `id`, `client_id`, `name`, `description`, `format`, `schedule`, `cover_art_url`, `created_at`, `updated_at`

**`episodes`**: `id`, `show_id`, `title`, `episode_number`, `status`, `stage_id` (FK to pipeline_stages), `scheduled_publish_date`, `description`, `frame_io_url`, `image_url`, `position`, `archived_at`

---

## Task 1: PipelineProgress Component

**Files:**
- Create: `src/components/portal/pipeline-progress.tsx`

**Step 1: Create the component**

This is a pure presentational component. It renders a horizontal step indicator with dots connected by lines. Stages before and including the current stage are "completed" (filled), stages after are "upcoming" (hollow).

```tsx
// src/components/portal/pipeline-progress.tsx
interface Stage {
  id: string
  name: string
  position: number
}

interface PipelineProgressProps {
  stages: Stage[]
  currentStageId: string | null
  size?: 'compact' | 'default'
}

export function PipelineProgress({ stages, currentStageId, size = 'default' }: PipelineProgressProps) {
  const sorted = [...stages].sort((a, b) => a.position - b.position)
  const currentIndex = sorted.findIndex((s) => s.id === currentStageId)

  if (sorted.length === 0) return null

  const isCompact = size === 'compact'

  return (
    <div className="flex items-center gap-0">
      {sorted.map((stage, i) => {
        const isCompleted = i <= currentIndex
        const isCurrent = i === currentIndex
        return (
          <div key={stage.id} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`rounded-full ${
                  isCurrent
                    ? isCompact ? 'h-2 w-2 bg-accent' : 'h-3 w-3 bg-accent ring-2 ring-accent/25'
                    : isCompleted
                      ? isCompact ? 'h-2 w-2 bg-accent/50' : 'h-2.5 w-2.5 bg-accent/50'
                      : isCompact ? 'h-2 w-2 bg-surface-overlay border border-border-default' : 'h-2.5 w-2.5 bg-surface-overlay border border-border-default'
                }`}
                title={stage.name}
              />
              {!isCompact && (
                <span
                  className={`mt-1.5 text-[10px] leading-none whitespace-nowrap ${
                    isCurrent ? 'text-accent font-medium' : isCompleted ? 'text-text-secondary' : 'text-text-tertiary'
                  }`}
                >
                  {stage.name}
                </span>
              )}
            </div>
            {i < sorted.length - 1 && (
              <div
                className={`${isCompact ? 'w-3 h-px mx-0.5' : 'w-6 h-px mx-1'} ${
                  i < currentIndex ? 'bg-accent/50' : 'bg-border-subtle'
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
```

**Step 2: Verify build**

Run: `npx next build 2>&1 | grep -E "(error|Error|✓)"`
Expected: `✓ Compiled successfully`

**Step 3: Commit**

```bash
git add src/components/portal/pipeline-progress.tsx
git commit -m "feat(portal): add PipelineProgress step indicator component"
```

---

## Task 2: ShowHero Component

**Files:**
- Create: `src/components/portal/show-hero.tsx`

**Step 1: Create the component**

Displays show identity: cover art thumbnail alongside show name, format badge, and schedule. Uses the existing `Thumbnail` component.

```tsx
// src/components/portal/show-hero.tsx
import { Thumbnail } from '@/components/ui/thumbnail'

interface ShowHeroProps {
  show: {
    id: string
    name: string
    description?: string | null
    format?: string | null
    schedule?: string | null
    coverArtUrl?: string | null
  }
}

export function ShowHero({ show }: ShowHeroProps) {
  return (
    <div className="flex items-start gap-4">
      <Thumbnail
        id={show.id}
        imageUrl={show.coverArtUrl}
        className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-xl"
      />
      <div className="min-w-0">
        <h1 className="text-xl font-bold text-text-primary leading-tight">{show.name}</h1>
        {(show.format || show.schedule) && (
          <div className="flex items-center gap-2 mt-1.5">
            {show.format && (
              <span className="text-xs font-medium text-text-secondary bg-surface-overlay border border-border-subtle rounded-full px-2.5 py-0.5">
                {show.format}
              </span>
            )}
            {show.schedule && (
              <span className="text-xs text-text-tertiary">{show.schedule}</span>
            )}
          </div>
        )}
        {show.description && (
          <p className="mt-2 text-sm text-text-secondary leading-relaxed line-clamp-2">{show.description}</p>
        )}
      </div>
    </div>
  )
}
```

**Step 2: Verify build**

Run: `npx next build 2>&1 | grep -E "(error|Error|✓)"`
Expected: `✓ Compiled successfully`

**Step 3: Commit**

```bash
git add src/components/portal/show-hero.tsx
git commit -m "feat(portal): add ShowHero component with cover art and metadata"
```

---

## Task 3: ReviewQueue Component

**Files:**
- Create: `src/components/portal/review-queue.tsx`
- Modify: `src/components/portal/deliverable-card.tsx` — add optional `episodeContext` prop

**Step 1: Add episode context to DeliverableCard**

The existing `DeliverableCard` needs to optionally show which episode a deliverable belongs to. Add an `episodeContext` prop.

In `src/components/portal/deliverable-card.tsx`, update the interface and component:

```tsx
// Add to the DeliverableCardProps interface:
interface DeliverableCardProps {
  deliverable: Deliverable
  episodeContext?: string  // e.g. "Episode 12 — The Growth Playbook"
}

// Update the function signature:
export function DeliverableCard({ deliverable, episodeContext }: DeliverableCardProps) {
```

Then add the episode context line right above the title inside the card's `min-w-0` div. Insert it between the type/status badges row and the title `<h3>`:

```tsx
// After the badges div (flex items-center gap-2), before the h3 title:
{episodeContext && (
  <p className="text-[11px] text-text-tertiary mt-1">{episodeContext}</p>
)}
```

**Step 2: Create the ReviewQueue component**

This is a server-renderable wrapper that takes deliverables data (fetched by the page) and renders DeliverableCards grouped by episode.

```tsx
// src/components/portal/review-queue.tsx
'use client'

import { DeliverableCard } from './deliverable-card'

interface ReviewDeliverable {
  id: string
  type: string
  title: string
  description: string | null
  file_url: string | null
  status: string
  reviewer_notes: string | null
  reviewed_at: string | null
  created_at: string
  episode_title: string | null
  episode_number: number | null
}

interface ReviewQueueProps {
  deliverables: ReviewDeliverable[]
}

export function ReviewQueue({ deliverables }: ReviewQueueProps) {
  if (deliverables.length === 0) {
    return (
      <div className="rounded-lg border border-border-subtle bg-surface-raised/50 px-4 py-6 text-center">
        <p className="text-sm text-text-tertiary">You're all caught up</p>
        <p className="text-xs text-text-tertiary mt-1">Deliverables needing your review will appear here.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2.5">
      {deliverables.map((d) => {
        const context = d.episode_title
          ? d.episode_number != null
            ? `Episode ${d.episode_number} — ${d.episode_title}`
            : d.episode_title
          : null
        return (
          <DeliverableCard
            key={d.id}
            deliverable={d}
            episodeContext={context ?? undefined}
          />
        )
      })}
    </div>
  )
}
```

**Step 3: Verify build**

Run: `npx next build 2>&1 | grep -E "(error|Error|✓)"`
Expected: `✓ Compiled successfully`

**Step 4: Commit**

```bash
git add src/components/portal/review-queue.tsx src/components/portal/deliverable-card.tsx
git commit -m "feat(portal): add ReviewQueue component with episode context on deliverables"
```

---

## Task 4: Redesign Show Detail Page

This is the biggest task — the primary portal experience. Wire together ShowHero, ReviewQueue, updated EpisodeTimeline with PipelineProgress, and ActivityFeed.

**Files:**
- Modify: `src/app/portal/shows/[showId]/page.tsx` — full rewrite
- Modify: `src/components/portal/episode-timeline.tsx` — add PipelineProgress support

**Step 1: Update EpisodeTimeline**

Replace the current flat-row list with richer cards that include the pipeline progress indicator. The component receives stages and renders `PipelineProgress` per episode.

Rewrite `src/components/portal/episode-timeline.tsx`:

```tsx
// src/components/portal/episode-timeline.tsx
import Link from 'next/link'
import { PipelineProgress } from './pipeline-progress'

interface Stage {
  id: string
  name: string
  position: number
}

interface Episode {
  id: string
  title: string
  episode_number: number | null
  status: string
  stage_id: string | null
  scheduled_publish_date: string | null
  pendingCount: number
}

interface EpisodeTimelineProps {
  episodes: Episode[]
  stages: Stage[]
  showId: string
}

export function EpisodeTimeline({ episodes, stages, showId }: EpisodeTimelineProps) {
  if (episodes.length === 0) {
    return (
      <p className="text-sm text-text-tertiary py-8 text-center">
        No episodes yet.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {episodes.map((ep) => (
        <Link
          key={ep.id}
          href={`/portal/shows/${showId}/episodes/${ep.id}`}
          className="block rounded-lg bg-surface-raised border border-border-subtle p-4 hover:border-border-default transition-colors group"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {ep.episode_number != null && (
                  <span className="text-xs font-mono text-text-tertiary shrink-0">
                    {String(ep.episode_number).padStart(2, '0')}
                  </span>
                )}
                <span className="text-sm font-medium text-text-primary group-hover:text-accent transition-colors truncate">
                  {ep.title}
                </span>
              </div>
              {stages.length > 0 && (
                <div className="mt-2.5">
                  <PipelineProgress stages={stages} currentStageId={ep.stage_id} size="compact" />
                </div>
              )}
            </div>
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              {ep.pendingCount > 0 && (
                <span className="text-xs text-accent font-medium">
                  {ep.pendingCount} to review
                </span>
              )}
              {ep.scheduled_publish_date && (
                <span className="text-[11px] text-text-tertiary">
                  {new Date(ep.scheduled_publish_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              )}
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}
```

**Step 2: Rewrite the show detail page**

Replace `src/app/portal/shows/[showId]/page.tsx` with the new layout: ShowHero → ReviewQueue → Episodes → Activity.

Key query changes:
- Fetch `cover_art_url` and `schedule` on the show
- Fetch pipeline stages for the show (for PipelineProgress)
- Fetch pending deliverables with episode joins in a single query (no more N+1)
- Fetch episodes with stage_id (for PipelineProgress) and pending counts via a single aggregated query
- Parallelize independent queries with `Promise.all`

```tsx
// src/app/portal/shows/[showId]/page.tsx
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { resolveImageUrl } from '@/lib/r2/client'
import { ShowHero } from '@/components/portal/show-hero'
import { ReviewQueue } from '@/components/portal/review-queue'
import { EpisodeTimeline } from '@/components/portal/episode-timeline'
import { ActivityFeed } from '@/components/portal/activity-feed'

export default async function PortalShowPage({
  params,
}: {
  params: Promise<{ showId: string }>
}) {
  const { showId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: show } = await supabase
    .from('shows')
    .select('id, name, description, format, schedule, cover_art_url')
    .eq('id', showId)
    .single()

  if (!show) redirect('/portal')

  const [
    { data: stages },
    { data: episodes },
    { data: pendingDeliverables },
    { data: allPendingRows },
    { data: activities },
  ] = await Promise.all([
    supabase
      .from('pipeline_stages')
      .select('id, name, position')
      .eq('show_id', showId)
      .order('position', { ascending: true }),
    supabase
      .from('episodes')
      .select('id, title, episode_number, status, stage_id, scheduled_publish_date')
      .eq('show_id', showId)
      .is('archived_at', null)
      .order('episode_number', { ascending: true, nullsFirst: false }),
    supabase
      .from('deliverables')
      .select('id, type, title, description, file_url, status, reviewer_notes, reviewed_at, created_at, episode_id, episodes(title, episode_number)')
      .eq('show_id', showId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false }),
    supabase
      .from('deliverables')
      .select('episode_id')
      .eq('show_id', showId)
      .eq('status', 'pending'),
    supabase
      .from('activity_log')
      .select('*')
      .eq('show_id', showId)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  // Build pending count per episode
  const pendingByEpisode = new Map<string, number>()
  for (const row of allPendingRows ?? []) {
    if (row.episode_id) {
      pendingByEpisode.set(row.episode_id, (pendingByEpisode.get(row.episode_id) ?? 0) + 1)
    }
  }

  const episodesWithPending = (episodes ?? []).map((ep) => ({
    id: ep.id,
    title: ep.title,
    episode_number: ep.episode_number,
    status: ep.status,
    stage_id: ep.stage_id,
    scheduled_publish_date: ep.scheduled_publish_date,
    pendingCount: pendingByEpisode.get(ep.id) ?? 0,
  }))

  // Transform deliverables for ReviewQueue
  const reviewItems = (pendingDeliverables ?? []).map((d) => {
    const epRaw = d.episodes as unknown
    const ep = (Array.isArray(epRaw) ? epRaw[0] : epRaw) as { title: string; episode_number: number | null } | null
    return {
      id: d.id,
      type: d.type,
      title: d.title,
      description: d.description,
      file_url: d.file_url,
      status: d.status,
      reviewer_notes: d.reviewer_notes,
      reviewed_at: d.reviewed_at,
      created_at: d.created_at,
      episode_title: ep?.title ?? null,
      episode_number: ep?.episode_number ?? null,
    }
  })

  return (
    <div className="space-y-10">
      <ShowHero
        show={{
          id: show.id,
          name: show.name,
          description: show.description,
          format: show.format,
          schedule: show.schedule,
          coverArtUrl: resolveImageUrl(show.cover_art_url),
        }}
      />

      <section>
        <h2 className="text-sm font-medium text-text-secondary mb-3">
          Needs Your Review
          {reviewItems.length > 0 && (
            <span className="ml-2 text-accent font-medium">({reviewItems.length})</span>
          )}
        </h2>
        <ReviewQueue deliverables={reviewItems} />
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-text-secondary">Episodes</h2>
          <Link
            href={`/portal/shows/${showId}/assets`}
            className="text-xs text-accent hover:text-accent-hover transition-colors"
          >
            Brand assets
          </Link>
        </div>
        <EpisodeTimeline
          episodes={episodesWithPending}
          stages={stages ?? []}
          showId={showId}
        />
      </section>

      {activities && activities.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-text-secondary mb-3">Recent Activity</h2>
          <div className="rounded-lg bg-surface-raised border border-border-subtle p-4">
            <ActivityFeed activities={activities} />
          </div>
        </section>
      )}
    </div>
  )
}
```

**Step 3: Verify build**

Run: `npx next build 2>&1 | grep -E "(error|Error|✓)"`
Expected: `✓ Compiled successfully`

**Step 4: Start dev server and test**

Run: `npx next dev --port 3003 --hostname 0.0.0.0`
Visit: `dev.preroll.io/portal/shows/{showId}` (or via single-show redirect at `/portal`)

Verify:
- ShowHero renders with cover art (or gradient fallback), name, format, schedule
- Review queue shows pending deliverables with episode context
- Approve/revise buttons work from the review queue
- Episode cards show PipelineProgress dots
- Activity feed renders at bottom
- No Frame.io links visible anywhere

**Step 5: Commit**

```bash
git add src/app/portal/shows/\[showId\]/page.tsx src/components/portal/episode-timeline.tsx
git commit -m "feat(portal): redesign show detail page with hero, review queue, and progress indicators"
```

---

## Task 5: Refresh Multi-Show Dashboard

**Files:**
- Modify: `src/app/portal/page.tsx`
- Modify: `src/app/portal/layout.tsx` — pass client name to children (for welcome line)

**Step 1: Update portal layout to pass client name**

The layout already fetches `client.name`. We need to make it available to the dashboard page. The simplest approach: the layout already passes `clientName` to the header; the dashboard page can fetch it independently (it already fetches the client record).

No changes needed to layout — the dashboard page already fetches the client.

**Step 2: Rewrite the dashboard page**

Update `src/app/portal/page.tsx` to:
- Add welcome line with client name
- Fetch `cover_art_url` on shows
- Render richer show cards with cover art thumbnails

```tsx
// src/app/portal/page.tsx
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { resolveImageUrl } from '@/lib/r2/client'
import { Thumbnail } from '@/components/ui/thumbnail'

export default async function PortalDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: client } = await supabase
    .from('clients')
    .select('id, name')
    .eq('client_user_id', user.id)
    .single()

  if (!client) redirect('/login')

  const { data: shows } = await supabase
    .from('shows')
    .select('id, name, format, cover_art_url, episodes(id)')
    .eq('client_id', client.id)
    .order('name')

  if (!shows || shows.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-lg text-text-secondary">No shows yet.</p>
        <p className="text-sm text-text-tertiary mt-2">Your producer will set things up soon.</p>
      </div>
    )
  }

  if (shows.length === 1) {
    redirect(`/portal/shows/${shows[0].id}`)
  }

  const showIds = shows.map((s) => s.id)
  const { data: pendingRows } = await supabase
    .from('deliverables')
    .select('show_id')
    .in('show_id', showIds)
    .eq('status', 'pending')

  const pendingByShow = new Map<string, number>()
  for (const row of pendingRows ?? []) {
    pendingByShow.set(row.show_id, (pendingByShow.get(row.show_id) ?? 0) + 1)
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-lg text-text-primary">
          Welcome back, <span className="font-semibold">{client.name.split(' ')[0]}</span>
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {shows.map((show) => {
          const episodes = show.episodes as { id: string }[]
          const pendingCount = pendingByShow.get(show.id) ?? 0
          return (
            <Link
              key={show.id}
              href={`/portal/shows/${show.id}`}
              className="rounded-xl bg-surface-raised border border-border-subtle overflow-hidden hover:border-border-default transition-colors group"
            >
              <Thumbnail
                id={show.id}
                imageUrl={resolveImageUrl(show.cover_art_url)}
                className="aspect-[3/1]"
              />
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="font-medium text-text-primary group-hover:text-accent transition-colors truncate">
                      {show.name}
                    </h2>
                    {show.format && (
                      <p className="text-xs text-text-tertiary mt-0.5">{show.format}</p>
                    )}
                  </div>
                  {pendingCount > 0 && (
                    <span className="shrink-0 rounded-full bg-accent/15 text-accent text-xs font-medium px-2.5 py-0.5">
                      {pendingCount} to review
                    </span>
                  )}
                </div>
                <p className="text-xs text-text-tertiary mt-2">
                  {episodes.length} episode{episodes.length !== 1 ? 's' : ''}
                </p>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
```

**Step 3: Verify build**

Run: `npx next build 2>&1 | grep -E "(error|Error|✓)"`
Expected: `✓ Compiled successfully`

**Step 4: Test**

To test the multi-show dashboard, you need a client linked to 2+ shows. The test user (Sarah Mitchell) has two shows, so visit `/portal` directly. Verify:
- Welcome line shows "Welcome back, Sarah"
- Two show cards with cover art (or gradient)
- Pending badge on shows with pending deliverables
- Click through to show detail works

**Step 5: Commit**

```bash
git add src/app/portal/page.tsx
git commit -m "feat(portal): refresh dashboard with welcome line, cover art, and richer show cards"
```

---

## Task 6: Redesign Episode Detail Page

**Files:**
- Modify: `src/app/portal/shows/[showId]/episodes/[episodeId]/page.tsx`

**Step 1: Rewrite the episode detail page**

Key changes:
- Add PipelineProgress at the top
- Remove Frame.io callout entirely
- Parallelize queries
- Keep DeliverableCard for deliverables
- Show description/show notes at bottom

```tsx
// src/app/portal/shows/[showId]/episodes/[episodeId]/page.tsx
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PipelineProgress } from '@/components/portal/pipeline-progress'
import { DeliverableCard } from '@/components/portal/deliverable-card'

export default async function PortalEpisodePage({
  params,
}: {
  params: Promise<{ showId: string; episodeId: string }>
}) {
  const { showId, episodeId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: show }, { data: episode }, { data: stages }, { data: deliverables }] = await Promise.all([
    supabase
      .from('shows')
      .select('id, name')
      .eq('id', showId)
      .single(),
    supabase
      .from('episodes')
      .select('id, title, episode_number, status, stage_id, scheduled_publish_date, description')
      .eq('id', episodeId)
      .eq('show_id', showId)
      .single(),
    supabase
      .from('pipeline_stages')
      .select('id, name, position')
      .eq('show_id', showId)
      .order('position', { ascending: true }),
    supabase
      .from('deliverables')
      .select('*')
      .eq('episode_id', episodeId)
      .order('created_at', { ascending: false }),
  ])

  if (!show) redirect('/portal')
  if (!episode) redirect(`/portal/shows/${showId}`)

  return (
    <div className="space-y-8">
      <div>
        <Link
          href={`/portal/shows/${showId}`}
          className="text-xs text-text-tertiary hover:text-text-secondary transition-colors"
        >
          &larr; {show.name}
        </Link>

        <div className="mt-3">
          <div className="flex items-center gap-2">
            {episode.episode_number != null && (
              <span className="text-sm font-mono text-text-tertiary">#{episode.episode_number}</span>
            )}
            <h1 className="text-lg font-semibold text-text-primary">{episode.title}</h1>
          </div>
          {episode.scheduled_publish_date && (
            <p className="text-xs text-text-tertiary mt-1.5">
              Scheduled {new Date(episode.scheduled_publish_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          )}
        </div>

        {stages && stages.length > 0 && (
          <div className="mt-5">
            <PipelineProgress stages={stages} currentStageId={episode.stage_id} />
          </div>
        )}
      </div>

      <section>
        <h2 className="text-sm font-medium text-text-secondary mb-3">
          Deliverables
          {deliverables && deliverables.length > 0 && (
            <span className="ml-2 text-text-tertiary font-normal">({deliverables.length})</span>
          )}
        </h2>

        {!deliverables || deliverables.length === 0 ? (
          <p className="text-sm text-text-tertiary py-4 text-center">
            No deliverables yet for this episode.
          </p>
        ) : (
          <div className="space-y-2.5">
            {deliverables.map((d) => (
              <DeliverableCard key={d.id} deliverable={d} />
            ))}
          </div>
        )}
      </section>

      {episode.description && (
        <section>
          <h2 className="text-sm font-medium text-text-secondary mb-3">Notes</h2>
          <div className="rounded-lg bg-surface-raised border border-border-subtle p-4">
            <p className="text-sm text-text-secondary whitespace-pre-wrap">{episode.description}</p>
          </div>
        </section>
      )}
    </div>
  )
}
```

**Step 2: Verify build**

Run: `npx next build 2>&1 | grep -E "(error|Error|✓)"`
Expected: `✓ Compiled successfully`

**Step 3: Test**

Visit `/portal/shows/{showId}/episodes/{episodeId}`. Verify:
- Pipeline progress shows with current stage highlighted
- No Frame.io link visible
- Deliverables display with approve/revise buttons
- Episode description shows at bottom if present
- Back link works

**Step 4: Commit**

```bash
git add src/app/portal/shows/\[showId\]/episodes/\[episodeId\]/page.tsx
git commit -m "feat(portal): redesign episode detail with pipeline progress, drop Frame.io link"
```

---

## Task 7: Polish and Test Full Flow

**Files:** No new files — this is verification and minor fixes.

**Step 1: Test single-show redirect flow**

The most common flow. Visit `/portal` while linked to a client with one show. Verify it redirects to the show detail page and the full experience works:
- ShowHero visible
- Review queue with pending deliverables
- Approve a deliverable from the review queue → page refreshes, item disappears
- Request revision → textarea appears → submit → item shows revision status
- Episodes list with pipeline progress dots
- Click episode → episode detail with full progress indicator

**Step 2: Test multi-show flow**

Temporarily link the test user to a client with multiple shows (Sarah Mitchell has 2). Visit `/portal`:
- Welcome line shows first name
- Both show cards render with cover art / gradient
- Pending badges display correctly
- Click through to show detail works

**Step 3: Test responsive behavior**

Check the show detail page at mobile widths:
- ShowHero stacks gracefully (cover art + text)
- Review queue cards are usable on small screens
- Episode cards don't overflow
- Pipeline progress dots remain legible

**Step 4: Fix any issues found**

Address layout, spacing, or data issues discovered during testing.

**Step 5: Final commit**

```bash
git add -A
git commit -m "fix(portal): polish and responsive fixes from testing"
```

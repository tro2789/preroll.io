# Client Portal Redesign

**Goal:** Transform the client portal from a barebones admin-style list view into a polished, client-facing experience that surfaces actionable items immediately and makes clients feel informed without asking.

**Key insight:** 99% of clients have a single show. The show detail page IS the portal for almost everyone. Design for that case first; multi-show is an edge case.

---

## Design Principles

- **Action-first:** Pending deliverables are the primary reason clients visit. Surface them early, make them actionable inline.
- **Reduce hops:** A client should be able to land, review, approve, and leave — without navigating to 3 separate pages.
- **Status page, not admin panel:** Bigger type, more breathing room, fewer UI controls. Clients should feel informed, not overwhelmed.
- **Frame.io is invisible:** Clients never see Frame.io links or branding. Deliverables come through PreRoll; Frame.io is a backend integration.

---

## Page Designs

### 1. Show Detail Page (`/portal/shows/:showId`)

This is the primary portal experience. Most clients land here directly (single-show redirect). It serves four roles in this order:

#### A. Show Header
- Cover art thumbnail (or gradient fallback) alongside show name
- Format badge (e.g., "Weekly Interview") and schedule if set
- Compact — anchors the page identity without dominating it

#### B. Review Queue
- Prominent section listing ALL pending deliverables across all episodes for this show
- Each item is an actionable card showing:
  - Deliverable type label (e.g., "Rough Cut", "Thumbnail")
  - Episode name for context (e.g., "Episode 12 — The Growth Playbook")
  - File link ("View file" opens in new tab) if `file_url` exists
  - **Approve** button (green) and **Request Revision** button (opens inline textarea)
- When nothing is pending: a subtle "You're all caught up" message (section stays visible so clients know where reviews appear)
- This is the same `DeliverableCard` component used on the episode detail page, with an added episode context line

#### C. Episodes
- Richer cards than the current flat rows
- Each episode card shows:
  - Episode number and title
  - **Pipeline progress indicator**: horizontal dots/segments showing all stages for the show, with the current stage highlighted. Gives clients a visual sense of "where is this" without exposing the full kanban. Example: `[Recording] --- [Editing] --- [*Review*] --- [Approved] --- [Published]`
  - Scheduled publish date
  - Subtle pending deliverable count if any (but the review queue above is the primary action point)
- Clicking an episode goes to the episode detail page for full context

#### D. Activity Feed
- Timeline of recent activity for the show (last 20 entries)
- Better visual treatment: proper icons per action type, relative timestamps
- Sits below episodes as supporting context

### 2. Multi-Show Dashboard (`/portal`)

Lean lobby page for the rare multi-show client. Gets out of the way fast.

- Welcome line with client name: "Welcome back, Sarah"
- Show cards in a responsive grid, each with:
  - Cover art thumbnail (or gradient fallback)
  - Show name, format label
  - Episode count
  - Pending deliverable count badge (amber) if any — signals "go here first"
- No review queue, no activity feed, no episode lists
- Clicking a show card goes to the show detail page

Single-show clients still auto-redirect past this page entirely.

### 3. Episode Detail Page (`/portal/shows/:showId/episodes/:episodeId`)

Deep-dive page for full episode context. Since the review queue on the show page handles quick approvals, this page is about understanding status.

- **Header:** Episode number, title, scheduled publish date. Back link to show.
- **Pipeline progress indicator:** Horizontal step visualization showing all stages for this show with the current stage highlighted. Same component as on the episode cards, but can be slightly larger/more prominent here.
- **Deliverables:** Same actionable `DeliverableCard` components. If the client already approved from the show page, it shows as approved here.
- **Episode description / show notes:** If populated, displayed below deliverables as supporting context.
- **No Frame.io link.** Frame.io is a backend integration, not surfaced to clients.

### 4. Assets Page (`/portal/shows/:showId/assets`)

No changes in this redesign. Functional enough for now.

### 5. Portal Header

No changes. Current header works fine.

---

## New Components

### `PipelineProgress`
- Horizontal step indicator component
- Props: `stages: { name: string }[]`, `currentStageId: string`
- Renders dots or segments connected by lines, current stage highlighted with accent color
- Completed stages (earlier in pipeline) shown as filled, future stages as hollow/muted
- Used on both episode cards (compact) and episode detail page (larger)

### `ReviewQueue`
- Server component that fetches all pending deliverables for a show
- Groups by episode (with episode title as context)
- Renders `DeliverableCard` for each, adding an episode context line
- Shows "You're all caught up" when empty

### `ShowHero`
- Cover art + show name + format badge + schedule
- Reusable across show detail and potentially multi-show cards

### Updated `EpisodeTimeline`
- Replace flat rows with cards that include the `PipelineProgress` indicator
- Keep episode number, title, date, pending count

### Updated Portal Dashboard (`/portal/page.tsx`)
- Add welcome line
- Upgrade show cards with cover art thumbnails (query needs `cover_art_url`)

---

## Data Changes

No schema changes needed. All data already exists:
- `deliverables` table has `status`, `type`, `title`, `file_url`, `episode_id`, `show_id`
- `shows` table has `cover_art_url`, `format`, `schedule`
- `pipeline_stages` table has stage names and positions
- `activity_log` table has action types and descriptions

Queries need adjustment:
- Show detail page: fetch pending deliverables with episode joins in a single query (replaces the N+1 per-episode count)
- Dashboard: add `cover_art_url` to the show query
- Episode detail: fetch pipeline stages for the show (for progress indicator)

---

## Performance Considerations

- Review queue on show detail: single query with `status = 'pending'` and episode join, not N+1 per episode
- Pipeline stages: fetched once per show page load, passed to episode cards as props
- Cover art images: use existing `Thumbnail` component with `loading="lazy"`

---

## What We're NOT Building

- No changes to the assets page
- No inline file previews (external links are fine for now)
- No comments/discussion threads (revision notes cover the feedback loop)
- No notification system (future phase)
- No changes to the portal header
- No Frame.io links anywhere in the portal

---

## Build Sequence

### Task 1: PipelineProgress component
Create the horizontal step indicator. Accepts stages array and current stage ID. Two sizes: compact (for episode cards) and default (for episode detail). Pure presentational component.

### Task 2: ShowHero component
Cover art thumbnail + show name + format + schedule. Used on show detail page header.

### Task 3: ReviewQueue component
Fetches pending deliverables for a show with episode context. Renders DeliverableCard instances with episode name. Shows "all caught up" when empty.

### Task 4: Redesign show detail page
Wire together: ShowHero at top, ReviewQueue below it, updated EpisodeTimeline with PipelineProgress cards, activity feed at bottom. Fix the N+1 pending count query. Drop Frame.io link from episode detail page.

### Task 5: Refresh multi-show dashboard
Add welcome line, upgrade show cards with cover art and richer layout. Add cover_art_url to the query.

### Task 6: Redesign episode detail page
Add PipelineProgress indicator. Remove Frame.io callout. Keep deliverables and description. Parallelize queries.

### Task 7: Polish and test
Test single-show flow (redirect → show detail with review queue). Test multi-show flow. Test approve/revise from show page and episode page. Verify responsive behavior on mobile.

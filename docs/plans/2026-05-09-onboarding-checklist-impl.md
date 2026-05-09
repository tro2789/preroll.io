# Onboarding Checklist Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a dashboard checklist card that guides new users through the core workflow (client → show → episode → pipeline), with sample data seeded on signup so the app never feels empty.

**Architecture:** New migration adds `is_sample` to clients and `onboarding_dismissed_at` to organizations. The existing `create_default_org` trigger is extended to seed a sample client/show/episode. A new `GET /api/v1/onboarding` endpoint returns step completion status by querying non-sample data counts. A client component renders the checklist card on the dashboard.

**Tech Stack:** Next.js App Router, Supabase Postgres, Tailwind CSS

---

### Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/019_onboarding.sql`

**Step 1: Write the migration**

```sql
-- 1. Add is_sample flag to clients
ALTER TABLE clients ADD COLUMN is_sample BOOLEAN NOT NULL DEFAULT false;

-- 2. Add onboarding_dismissed_at to organizations
ALTER TABLE organizations ADD COLUMN onboarding_dismissed_at TIMESTAMPTZ;

-- 3. Update create_default_org trigger to seed sample data
CREATE OR REPLACE FUNCTION create_default_org()
RETURNS TRIGGER AS $$
DECLARE
  new_org_id uuid;
  new_client_id uuid;
  new_show_id uuid;
  first_stage_id uuid;
  user_name text;
  user_slug text;
BEGIN
  user_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));
  user_slug := REPLACE(NEW.id::text, '-', '');

  INSERT INTO public.organizations (name, slug, trial_ends_at)
  VALUES (user_name || '''s Workspace', user_slug, NOW() + INTERVAL '7 days')
  RETURNING id INTO new_org_id;

  INSERT INTO public.memberships (org_id, user_id, role)
  VALUES (new_org_id, NEW.id, 'owner');

  -- Seed sample client
  INSERT INTO public.clients (org_id, user_id, name, notes, is_sample)
  VALUES (new_org_id, NEW.id, 'Sample Client', 'This is a sample client to help you explore PreRoll. Edit or delete it anytime.', true)
  RETURNING id INTO new_client_id;

  -- Seed sample show
  INSERT INTO public.shows (client_id, name, description)
  VALUES (new_client_id, 'My First Podcast', 'A sample show to see how PreRoll organizes episodes.')
  RETURNING id INTO new_show_id;

  -- Seed default pipeline stages for sample show
  INSERT INTO public.pipeline_stages (show_id, name, position, status_override) VALUES
    (new_show_id, 'Planning', 1, 'planning'),
    (new_show_id, 'Recording', 2, 'recording'),
    (new_show_id, 'Editing', 3, 'editing'),
    (new_show_id, 'Review', 4, 'review'),
    (new_show_id, 'Approved', 5, 'approved'),
    (new_show_id, 'Published', 6, 'published');

  -- Get the first stage ID for the sample episode
  SELECT id INTO first_stage_id FROM public.pipeline_stages
    WHERE show_id = new_show_id AND position = 1;

  -- Seed sample episode
  INSERT INTO public.episodes (show_id, title, episode_number, stage_id, status, position)
  VALUES (new_show_id, 'Episode 1 — Getting Started', 1, first_stage_id, 'planning', 0);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

**Step 2: Apply migration to dev database**

Run the migration SQL against the dev Supabase project (`pvcrgllkcvznpxsxlehm`) using `mcp__supabase__execute_sql`.

**Step 3: Apply migration to prod database**

Run the same migration SQL against the prod Supabase project (`bjslxxufxvzssgrcmuzs`).

**Step 4: Update the migration file in 016**

Update `supabase/migrations/016_organizations_billing.sql` to match the new trigger (for consistency with the canonical trigger definition). The new migration 019 is the one that actually runs.

**Step 5: Commit**

```bash
git add supabase/migrations/019_onboarding.sql supabase/migrations/016_organizations_billing.sql
git commit -m "feat: add onboarding schema — is_sample, onboarding_dismissed_at, sample data trigger"
```

---

### Task 2: Onboarding API — GET endpoint

**Files:**
- Create: `src/app/api/v1/onboarding/route.ts`

**Step 1: Create the onboarding GET route**

```typescript
import { getAuthenticatedClient, jsonResponse } from '@/lib/api/helpers'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const { org, error } = await getAuthenticatedClient()
  if (error) return error

  const service = createServiceClient()

  const { data: orgData } = await service
    .from('organizations')
    .select('onboarding_dismissed_at')
    .eq('id', org!.id)
    .single()

  if (orgData?.onboarding_dismissed_at) {
    return jsonResponse({ dismissed: true })
  }

  const [clientsRes, showsRes, episodesRes, movedRes, sampleRes, firstClientRes, firstShowRes] = await Promise.all([
    service.from('clients').select('id', { count: 'exact', head: true })
      .eq('org_id', org!.id).eq('is_sample', false),
    service.rpc('count_real_shows', { p_org_id: org!.id }),
    service.rpc('count_real_episodes', { p_org_id: org!.id }),
    service.rpc('count_moved_episodes', { p_org_id: org!.id }),
    service.from('clients').select('id', { count: 'exact', head: true })
      .eq('org_id', org!.id).eq('is_sample', true),
    service.from('clients').select('id')
      .eq('org_id', org!.id).eq('is_sample', false).limit(1).maybeSingle(),
    service.from('shows')
      .select('id, clients!inner(id)')
      .eq('clients.org_id', org!.id).eq('clients.is_sample', false).limit(1).maybeSingle(),
  ])

  const clientCreated = (clientsRes.count ?? 0) > 0
  const showCreated = (showsRes.data as number) > 0
  const episodeCreated = (episodesRes.data as number) > 0
  const episodeMoved = (movedRes.data as number) > 0

  return jsonResponse({
    dismissed: false,
    steps: {
      client_created: clientCreated,
      show_created: showCreated,
      episode_created: episodeCreated,
      episode_moved: episodeMoved,
    },
    sample_client_exists: (sampleRes.count ?? 0) > 0,
    links: {
      create_client: '/app/clients',
      add_show: firstClientRes.data ? `/app/clients/${firstClientRes.data.id}` : '/app/clients',
      create_episode: firstShowRes.data ? `/app/shows/${firstShowRes.data.id}` : '/app/shows',
      move_episode: '/app',
    },
  })
}
```

Note: The RPC functions (`count_real_shows`, `count_real_episodes`, `count_moved_episodes`) are needed because Supabase JS client doesn't support multi-table JOINs with count in a clean way. We'll create these as simple SQL functions in the migration.

**Step 2: Add the RPC functions to the migration**

Add these to `supabase/migrations/019_onboarding.sql` (before the trigger update):

```sql
-- Helper functions for onboarding step detection
CREATE OR REPLACE FUNCTION count_real_shows(p_org_id uuid)
RETURNS integer AS $$
  SELECT count(*)::integer FROM shows s
    JOIN clients c ON s.client_id = c.id
    WHERE c.org_id = p_org_id AND c.is_sample = false;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION count_real_episodes(p_org_id uuid)
RETURNS integer AS $$
  SELECT count(*)::integer FROM episodes e
    JOIN shows s ON e.show_id = s.id
    JOIN clients c ON s.client_id = c.id
    WHERE c.org_id = p_org_id AND c.is_sample = false AND e.archived_at IS NULL;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION count_moved_episodes(p_org_id uuid)
RETURNS integer AS $$
  SELECT count(*)::integer FROM episodes e
    JOIN shows s ON e.show_id = s.id
    JOIN clients c ON s.client_id = c.id
    JOIN pipeline_stages ps ON e.stage_id = ps.id
    WHERE c.org_id = p_org_id AND c.is_sample = false AND ps.position > 1 AND e.archived_at IS NULL;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;
```

Apply these functions to both dev and prod databases.

**Step 3: Commit**

```bash
git add src/app/api/v1/onboarding/route.ts supabase/migrations/019_onboarding.sql
git commit -m "feat: onboarding GET endpoint with step detection"
```

---

### Task 3: Onboarding API — Dismiss and Remove Sample Data

**Files:**
- Create: `src/app/api/v1/onboarding/dismiss/route.ts`
- Create: `src/app/api/v1/onboarding/sample-data/route.ts`

**Step 1: Create the dismiss endpoint**

```typescript
import { getAuthenticatedClient, jsonResponse } from '@/lib/api/helpers'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST() {
  const { org, error } = await getAuthenticatedClient()
  if (error) return error

  const service = createServiceClient()

  await service
    .from('organizations')
    .update({ onboarding_dismissed_at: new Date().toISOString() })
    .eq('id', org!.id)

  await service
    .from('clients')
    .delete()
    .eq('org_id', org!.id)
    .eq('is_sample', true)

  return jsonResponse({ dismissed: true })
}
```

**Step 2: Create the remove sample data endpoint**

```typescript
import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'
import { createServiceClient } from '@/lib/supabase/server'

export async function DELETE() {
  const { org, error } = await getAuthenticatedClient()
  if (error) return error

  const service = createServiceClient()

  const { error: delError } = await service
    .from('clients')
    .delete()
    .eq('org_id', org!.id)
    .eq('is_sample', true)

  if (delError) return errorResponse(delError.message, 500)

  return jsonResponse({ removed: true })
}
```

**Step 3: Commit**

```bash
git add src/app/api/v1/onboarding/dismiss/route.ts src/app/api/v1/onboarding/sample-data/route.ts
git commit -m "feat: onboarding dismiss and remove-sample-data endpoints"
```

---

### Task 4: OnboardingChecklist Component

**Files:**
- Create: `src/components/dashboard/onboarding-checklist.tsx`

**Step 1: Build the component**

```tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface OnboardingData {
  dismissed: boolean
  steps?: {
    client_created: boolean
    show_created: boolean
    episode_created: boolean
    episode_moved: boolean
  }
  sample_client_exists?: boolean
  links?: {
    create_client: string
    add_show: string
    create_episode: string
    move_episode: string
  }
}

const STEP_LABELS = [
  { key: 'client_created', label: 'Create a client', linkKey: 'create_client' },
  { key: 'show_created', label: 'Add a show', linkKey: 'add_show' },
  { key: 'episode_created', label: 'Create an episode', linkKey: 'create_episode' },
  { key: 'episode_moved', label: 'Move an episode through the pipeline', linkKey: 'move_episode' },
] as const

export function OnboardingChecklist() {
  const router = useRouter()
  const [data, setData] = useState<OnboardingData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/v1/onboarding')
      .then((r) => r.json())
      .then((r) => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading || !data || data.dismissed) return null

  const steps = data.steps!
  const links = data.links!
  const completed = Object.values(steps).filter(Boolean).length
  const allDone = completed === 4

  if (allDone) {
    // Auto-dismiss and clean up sample data
    fetch('/api/v1/onboarding/dismiss', { method: 'POST' })
      .then(() => router.refresh())
    return null
  }

  async function handleDismiss() {
    await fetch('/api/v1/onboarding/dismiss', { method: 'POST' })
    setData({ dismissed: true })
    router.refresh()
  }

  async function handleRemoveSample() {
    await fetch('/api/v1/onboarding/sample-data', { method: 'DELETE' })
    setData((prev) => prev ? { ...prev, sample_client_exists: false } : prev)
    router.refresh()
  }

  const progress = (completed / 4) * 100

  return (
    <div className="rounded-xl border border-accent/20 bg-surface-raised p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-text-primary">Getting Started</h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-text-tertiary">{completed} of 4</span>
          <button
            onClick={handleDismiss}
            className="text-text-tertiary hover:text-text-secondary transition-colors"
            aria-label="Dismiss onboarding"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="h-1.5 rounded-full bg-surface-overlay mb-5">
        <div
          className="h-full rounded-full bg-accent transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <ul className="space-y-3">
        {STEP_LABELS.map(({ key, label, linkKey }) => {
          const done = steps[key]
          const isNext = !done && STEP_LABELS.every(
            (s) => s.key === key || steps[s.key] || STEP_LABELS.indexOf(s) > STEP_LABELS.findIndex((x) => x.key === key)
          )
          const href = links[linkKey]

          return (
            <li key={key} className="flex items-center gap-3">
              {done ? (
                <svg className="h-5 w-5 shrink-0 text-success" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              ) : (
                <div className={`h-5 w-5 shrink-0 rounded-full border-2 ${isNext ? 'border-accent' : 'border-border-default'}`} />
              )}
              {done ? (
                <span className="text-sm text-text-tertiary line-through">{label}</span>
              ) : isNext ? (
                <Link href={href} className="text-sm font-medium text-accent hover:text-accent-hover transition-colors">
                  {label} →
                </Link>
              ) : (
                <span className="text-sm text-text-tertiary">{label}</span>
              )}
            </li>
          )
        })}
      </ul>

      {data.sample_client_exists && (
        <button
          onClick={handleRemoveSample}
          className="mt-5 text-xs text-text-tertiary hover:text-text-secondary transition-colors"
        >
          Remove sample data
        </button>
      )}
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/dashboard/onboarding-checklist.tsx
git commit -m "feat: OnboardingChecklist component"
```

---

### Task 5: Integrate into Dashboard

**Files:**
- Modify: `src/app/app/page.tsx`

**Step 1: Add the checklist to the dashboard**

Add the import at the top of `src/app/app/page.tsx`:

```typescript
import { OnboardingChecklist } from '@/components/dashboard/onboarding-checklist'
```

Render it above the kanban/empty-state section, after the QuickCreate header:

```tsx
<OnboardingChecklist />
```

Place it directly after the closing `</div>` of the flex header row (the one containing QuickCreate), before the `{!hasAnyEpisodes ? ...}` conditional.

**Step 2: Build and verify**

```bash
npx next build
```

Expected: Clean build, no type errors.

**Step 3: Commit**

```bash
git add src/app/app/page.tsx
git commit -m "feat: render onboarding checklist on dashboard"
```

---

### Task 6: Test with a New Signup

**Step 1: Create a new test user on dev.preroll.io**

Sign up with a fresh email. Verify:
- [ ] Organization created with `trial_ends_at` set
- [ ] Sample client "Sample Client" exists with `is_sample = true`
- [ ] Sample show "My First Podcast" exists under the sample client
- [ ] Sample episode "Episode 1 — Getting Started" exists in Planning stage
- [ ] Dashboard shows the episode on the kanban
- [ ] Onboarding checklist card appears above the kanban with 0/4 steps complete

**Step 2: Walk through the checklist**

- [ ] Click "Create a client →" — navigates to clients page
- [ ] Create a real client — return to dashboard, step 1 shows checkmark
- [ ] Click "Add a show →" — navigates to the new client's detail page
- [ ] Create a show — return to dashboard, step 2 shows checkmark
- [ ] Click "Create an episode →" — navigates to the new show
- [ ] Create an episode — return to dashboard, step 3 shows checkmark
- [ ] Drag the episode to the next pipeline stage — step 4 auto-completes
- [ ] Checklist auto-dismisses, sample data deleted

**Step 3: Test edge cases**

- [ ] Click "Remove sample data" before completing steps — sample data deleted, kanban empties, checklist remains
- [ ] Click dismiss (X) — checklist disappears permanently
- [ ] Existing users (no sample data, no `onboarding_dismissed_at`) — checklist shows but "Remove sample data" link hidden

**Step 4: Push to dev and main**

```bash
git push origin dev
git checkout main && git merge dev && git push origin main && git checkout dev
```

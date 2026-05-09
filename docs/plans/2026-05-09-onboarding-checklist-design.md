# Onboarding Checklist Design

## Overview

A dashboard checklist card that guides new producers through the core workflow: client → show → episode → pipeline. Combined with sample data seeding so the app never feels empty on first login.

## Sample Data Seeding

On signup, the `create_default_org` trigger (or a post-signup hook) creates:

- **Client:** "Sample Client" with `is_sample = true` and notes: "This is a sample client. Edit or delete it anytime."
- **Show:** "My First Podcast" under the sample client, with default pipeline stages
- **Episode:** "Episode 1 — Getting Started" in the first stage (Planning)

This populates the dashboard kanban, client list, and show page so nothing is blank. The data is real — users can interact with it, but the checklist ignores it.

### Schema change

Add `is_sample BOOLEAN NOT NULL DEFAULT false` to the `clients` table. Shows and episodes under a sample client are implicitly sample data (no extra columns needed).

### Cleanup

- "Remove sample data" link on the checklist card deletes the sample client (cascades to its show/episode)
- Sample data also auto-deleted when the checklist is dismissed or all 4 steps complete

## Checklist Card

### Placement

Top of the dashboard page (`/app`), above the kanban board. Rendered as a `rounded-xl border border-accent/20 bg-surface-raised` card with a progress indicator.

### Visibility

- Shown when `onboarding_dismissed_at IS NULL` on the org AND not all steps are complete
- Hidden (permanently) when dismissed or all 4 steps complete
- `onboarding_dismissed_at` is a nullable timestamp on `organizations`

### Steps

| # | Label | Link | Complete when |
|---|-------|------|---------------|
| 1 | Create a client | `/app/clients` | ≥1 client where `is_sample = false` |
| 2 | Add a show | `/app/clients/[firstRealClientId]` | ≥1 show under a non-sample client |
| 3 | Create an episode | `/app/shows/[firstRealShowId]` | ≥1 episode under a non-sample client's show |
| 4 | Move an episode through the pipeline | `/app` (kanban) | ≥1 episode (non-sample) past the first pipeline stage |

Step 2's link points to the first real client's detail page (where shows are managed). Step 3 points to the first real show. If those don't exist yet, steps 2-3 link to `/app/clients` and `/app/shows` respectively.

### UI layout

```
┌─────────────────────────────────────────────────────────┐
│  Getting Started                          2 of 4  [x]  │
│  ─────────────────────────────────────────────────────  │
│  [progress bar ██████░░░░░░]                            │
│                                                         │
│  ✓  Create a client                                     │
│  ✓  Add a show                                          │
│  ○  Create an episode  →                                │
│  ○  Move an episode through the pipeline                │
│                                                         │
│  Remove sample data                                     │
└─────────────────────────────────────────────────────────┘
```

- Completed steps show a green checkmark, muted text
- Next incomplete step is highlighted with accent color and is a clickable link
- Future steps are dimmed but visible
- [x] is the dismiss button (sets `onboarding_dismissed_at`)
- Progress bar fills proportionally (0%, 25%, 50%, 75%, 100%)
- "Remove sample data" is a subtle text link at the bottom (only shown if sample client exists)

## Data flow

### Detection query

The dashboard page already fetches clients/shows/episodes. The onboarding card needs:

```sql
-- Count of real (non-sample) clients
SELECT count(*) FROM clients WHERE org_id = ? AND is_sample = false

-- Count of real shows (via join)
SELECT count(*) FROM shows s
  JOIN clients c ON s.client_id = c.id
  WHERE c.org_id = ? AND c.is_sample = false

-- Count of real episodes (via join)
SELECT count(*) FROM episodes e
  JOIN shows s ON e.show_id = s.id
  JOIN clients c ON s.client_id = c.id
  WHERE c.org_id = ? AND c.is_sample = false AND e.archived_at IS NULL

-- Any real episode past first stage
SELECT count(*) FROM episodes e
  JOIN shows s ON e.show_id = s.id
  JOIN clients c ON s.client_id = c.id
  JOIN pipeline_stages ps ON e.stage_id = ps.id
  WHERE c.org_id = ? AND c.is_sample = false AND ps.position > 1 AND e.archived_at IS NULL
```

These can be combined into a single API endpoint (`GET /api/v1/onboarding`) that returns:

```json
{
  "dismissed": false,
  "steps": {
    "client_created": true,
    "show_created": true,
    "episode_created": false,
    "episode_moved": false
  },
  "sample_client_exists": true,
  "links": {
    "create_client": "/app/clients",
    "add_show": "/app/clients/abc123",
    "create_episode": "/app/shows/def456",
    "move_episode": "/app"
  }
}
```

### Dismiss endpoint

`POST /api/v1/onboarding/dismiss` — sets `onboarding_dismissed_at = now()` on the org. Also deletes sample client if it exists.

### Remove sample data endpoint

`DELETE /api/v1/onboarding/sample-data` — deletes the sample client (cascades). Does not dismiss the checklist.

## Implementation sequence

1. **Migration:** Add `is_sample` to `clients`, `onboarding_dismissed_at` to `organizations`
2. **Trigger update:** Modify `create_default_org` to also create sample client/show/episode
3. **API:** Create `GET /api/v1/onboarding`, `POST /api/v1/onboarding/dismiss`, `DELETE /api/v1/onboarding/sample-data`
4. **Component:** Build `OnboardingChecklist` component
5. **Dashboard:** Render the checklist card above the kanban board
6. **Test:** New signup flow end-to-end

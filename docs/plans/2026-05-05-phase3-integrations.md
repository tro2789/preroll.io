# PreRoll Phase 3: Integrations Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a multi-provider integration foundation and a deep Frame.io integration as the first provider. Producers can connect their Frame.io account via OAuth, browse projects and assets, link Frame.io assets to episodes/deliverables, create review links, and receive webhook updates -- all without leaving PreRoll.

**Architecture:** A `user_integrations` table stores OAuth credentials per provider per user. A `file_references` table decouples external file pointers from any single provider. All provider interactions go through PreRoll API routes (server-side only, never client-side). A provider abstraction layer (`src/lib/integrations/`) makes adding future providers (Google Drive, Vimeo, Dropbox) straightforward without restructuring.

**Tech Stack:** Same as Phases 1-2 (Next.js 16, Supabase, Tailwind v4). No additional runtime dependencies required -- all OAuth/HTTP interactions use native `fetch`. Token encryption uses Node.js built-in `crypto` (AES-256-GCM).

---

## Data Model Changes

### New table: `user_integrations`

Stores OAuth connections at the user level. One user can connect multiple providers.

```sql
CREATE TYPE integration_provider AS ENUM ('frame_io', 'google_drive', 'vimeo', 'dropbox');

CREATE TABLE user_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  provider integration_provider NOT NULL,
  access_token_enc text NOT NULL,       -- AES-256-GCM encrypted
  refresh_token_enc text,               -- AES-256-GCM encrypted
  token_expires_at timestamptz,
  account_id text,                      -- provider's account/user ID
  account_name text,                    -- display name on the provider
  account_email text,
  account_avatar_url text,
  scopes text,                          -- space-separated granted scopes
  raw_metadata jsonb,                   -- provider-specific extras
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, provider)             -- one connection per provider per user
);

CREATE TRIGGER user_integrations_updated_at BEFORE UPDATE ON user_integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### New table: `file_references`

Links an external file from any provider to an episode or deliverable. Provider-agnostic.

```sql
CREATE TABLE file_references (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  provider integration_provider NOT NULL,
  external_id text NOT NULL,            -- provider's asset/file ID
  external_url text,                    -- direct link to file on provider
  name text NOT NULL,
  thumbnail_url text,
  mime_type text,
  file_size bigint,
  duration_seconds numeric,             -- for video/audio
  provider_metadata jsonb,              -- provider-specific data (label, comment_count, etc.)
  episode_id uuid REFERENCES episodes(id) ON DELETE CASCADE,
  deliverable_id uuid REFERENCES deliverables(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CHECK (episode_id IS NOT NULL OR deliverable_id IS NOT NULL)
);

CREATE TRIGGER file_references_updated_at BEFORE UPDATE ON file_references
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX file_references_episode_idx ON file_references(episode_id) WHERE episode_id IS NOT NULL;
CREATE INDEX file_references_deliverable_idx ON file_references(deliverable_id) WHERE deliverable_id IS NOT NULL;
CREATE INDEX file_references_external_idx ON file_references(provider, external_id);
```

### New table: `webhook_events`

Stores incoming webhook payloads for audit and idempotency.

```sql
CREATE TABLE webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider integration_provider NOT NULL,
  event_type text NOT NULL,
  external_id text,                     -- the asset/resource ID from the provider
  payload jsonb NOT NULL,
  processed_at timestamptz,
  error text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX webhook_events_provider_idx ON webhook_events(provider, event_type, created_at DESC);
```

### RLS Policies

```sql
-- user_integrations: only the owner can CRUD their own integrations
ALTER TABLE user_integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_integrations_owner ON user_integrations FOR ALL
  USING (user_id = auth.uid());

-- file_references: producer access
ALTER TABLE file_references ENABLE ROW LEVEL SECURITY;
CREATE POLICY file_references_owner ON file_references FOR ALL
  USING (user_id = auth.uid());

-- file_references: client read access (via their shows)
CREATE POLICY file_references_client ON file_references FOR SELECT
  USING (
    episode_id IN (
      SELECT e.id FROM episodes e
      JOIN shows s ON e.show_id = s.id
      JOIN clients c ON s.client_id = c.id
      WHERE c.client_user_id = auth.uid()
    )
    OR deliverable_id IN (
      SELECT d.id FROM deliverables d
      JOIN shows s ON d.show_id = s.id
      JOIN clients c ON s.client_id = c.id
      WHERE c.client_user_id = auth.uid()
    )
  );

-- webhook_events: no user access (server-side only, service role)
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
```

---

## File Structure (New Files)

```
src/
├── app/
│   ├── app/
│   │   └── settings/
│   │       ├── page.tsx                          -- Settings hub (redirects to integrations)
│   │       └── integrations/
│   │           └── page.tsx                      -- Connected accounts list + connect buttons
│   ├── auth/
│   │   └── integrations/
│   │       └── [provider]/
│   │           └── callback/
│   │               └── route.ts                  -- OAuth callback handler (all providers)
│   ├── api/
│   │   └── v1/
│   │       ├── integrations/
│   │       │   ├── route.ts                      -- GET (list), DELETE (disconnect)
│   │       │   ├── [provider]/
│   │       │   │   ├── auth-url/
│   │       │   │   │   └── route.ts              -- GET (generate OAuth URL)
│   │       │   │   ├── browse/
│   │       │   │   │   └── route.ts              -- GET (browse files/projects)
│   │       │   │   └── review-link/
│   │       │   │       └── route.ts              -- POST (create review link)
│   │       │   └── file-references/
│   │       │       ├── route.ts                  -- GET (list), POST (create)
│   │       │       └── [referenceId]/
│   │       │           └── route.ts              -- GET, PATCH, DELETE
│   │       └── webhooks/
│   │           └── [provider]/
│   │               └── route.ts                  -- POST (webhook ingress)
├── components/
│   ├── integrations/
│   │   ├── connect-button.tsx                    -- OAuth connect button per provider
│   │   ├── connected-account-card.tsx            -- Shows connected account with disconnect
│   │   ├── file-picker-modal.tsx                 -- Reusable file browser modal
│   │   ├── file-picker-breadcrumb.tsx            -- Breadcrumb nav in file picker
│   │   ├── file-picker-item.tsx                  -- Single file/folder item in picker
│   │   └── linked-file-badge.tsx                 -- Small badge showing linked provider asset
│   └── ...
├── lib/
│   └── integrations/
│       ├── types.ts                              -- Provider interface, shared types
│       ├── crypto.ts                             -- Token encryption/decryption (AES-256-GCM)
│       ├── token-refresh.ts                      -- Refresh token utility
│       ├── registry.ts                           -- Provider registry (maps enum -> implementation)
│       └── providers/
│           ├── frame-io.ts                       -- Frame.io V2 API client
│           ├── google-drive.ts                   -- (stub for future)
│           ├── vimeo.ts                          -- (stub for future)
│           └── dropbox.ts                        -- (stub for future)
└── ...

supabase/
└── migrations/
    └── 004_integrations.sql
```

---

## API Endpoints (New)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/integrations` | List user's connected integrations |
| DELETE | `/api/v1/integrations?provider=frame_io` | Disconnect a provider |
| GET | `/api/v1/integrations/[provider]/auth-url` | Generate OAuth authorization URL |
| GET | `/api/v1/integrations/[provider]/browse?path=` | Browse files/projects on the provider |
| POST | `/api/v1/integrations/[provider]/review-link` | Create a Frame.io review link |
| GET | `/api/v1/integrations/file-references?episode_id=` | List file references for an episode/deliverable |
| POST | `/api/v1/integrations/file-references` | Link an external file to an episode/deliverable |
| GET | `/api/v1/integrations/file-references/[id]` | Get file reference detail (with fresh metadata) |
| PATCH | `/api/v1/integrations/file-references/[id]` | Update file reference metadata |
| DELETE | `/api/v1/integrations/file-references/[id]` | Remove a file reference link |
| POST | `/api/v1/webhooks/[provider]` | Webhook ingress (unauthenticated, signature-verified) |

### OAuth Callback (page route, not API):

| Method | Path | Description |
|--------|------|-------------|
| GET | `/auth/integrations/[provider]/callback` | OAuth callback -- exchanges code for token, stores encrypted |

---

## Provider Interface

```typescript
// src/lib/integrations/types.ts

export type IntegrationProvider = 'frame_io' | 'google_drive' | 'vimeo' | 'dropbox'

export interface OAuthConfig {
  authUrl: string
  tokenUrl: string
  clientId: string
  clientSecret: string
  scopes: string[]
  callbackPath: string
}

export interface ProviderAccount {
  id: string
  name: string
  email?: string
  avatarUrl?: string
}

export interface BrowseItem {
  id: string
  name: string
  type: 'folder' | 'file' | 'project' | 'team'
  thumbnailUrl?: string
  mimeType?: string
  fileSize?: number
  durationSeconds?: number
  metadata?: Record<string, unknown>
  childrenCount?: number
}

export interface BrowseResult {
  items: BrowseItem[]
  breadcrumb: { id: string; name: string }[]
  pagination?: { page: number; pageSize: number; hasMore: boolean }
}

export interface ReviewLink {
  url: string
  name: string
  expiresAt?: string
}

export interface IntegrationProviderClient {
  readonly providerName: IntegrationProvider
  readonly displayName: string
  readonly oauthConfig: OAuthConfig

  getAuthUrl(state: string): string
  exchangeCode(code: string): Promise<{ accessToken: string; refreshToken?: string; expiresAt?: Date; account: ProviderAccount }>
  refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; refreshToken?: string; expiresAt?: Date }>

  browse(accessToken: string, path?: string, page?: number): Promise<BrowseResult>
  getAssetDetails(accessToken: string, assetId: string): Promise<BrowseItem>

  createReviewLink?(accessToken: string, assetIds: string[], name: string): Promise<ReviewLink>
  verifyWebhookSignature?(payload: string, signature: string, timestamp: string): boolean
}
```

---

## Environment Variables (New)

```
# Frame.io OAuth (register app at https://developer.frame.io)
FRAMEIO_CLIENT_ID=
FRAMEIO_CLIENT_SECRET=

# Token encryption key (generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
INTEGRATION_ENCRYPTION_KEY=

# Frame.io Webhook secret (from developer.frame.io webhook config)
FRAMEIO_WEBHOOK_SECRET=
```

---

## Build Sequence

### Task 1: Database Migration -- Integrations Schema

**Files:**
- Create: `supabase/migrations/004_integrations.sql`

Write the migration with all three tables (`user_integrations`, `file_references`, `webhook_events`), the `integration_provider` enum, triggers, indexes, and RLS policies from the schema above.

**Commit:** `feat: add integrations database schema (user_integrations, file_references, webhooks)`

---

### Task 2: Token Encryption Utility

**Files:**
- Create: `src/lib/integrations/crypto.ts`

Implement AES-256-GCM encryption/decryption for OAuth tokens:
- `encrypt(plaintext: string): string` -- returns `iv:authTag:ciphertext` (all hex)
- `decrypt(encrypted: string): string` -- splits and decrypts
- Uses `INTEGRATION_ENCRYPTION_KEY` env var (32-byte hex key)
- Pure Node.js `crypto` module, no external dependencies

**Commit:** `feat: add token encryption utility for integration credentials`

---

### Task 3: Provider Types and Registry

**Files:**
- Create: `src/lib/integrations/types.ts`
- Create: `src/lib/integrations/registry.ts`

Define the `IntegrationProviderClient` interface and a registry that maps provider names to implementations:
- `getProvider(name: IntegrationProvider): IntegrationProviderClient`
- `getAllProviders(): { name: IntegrationProvider; displayName: string; comingSoon: boolean }[]`
- Initially only `frame_io` is registered; others return stubs

**Commit:** `feat: add integration provider types and registry`

---

### Task 4: Frame.io Provider Client

**Files:**
- Create: `src/lib/integrations/providers/frame-io.ts`

Implement the full Frame.io V2 API client:
- **OAuth config:** auth URL `https://applications.frame.io/oauth2/auth`, token URL `https://applications.frame.io/oauth2/token`, scopes `offline account.read team.read project.read asset.read asset.create comment.read reviewlink.read reviewlink.create`
- **`getAuthUrl(state)`** -- builds authorization URL with client_id, redirect_uri, scope, state, response_type=code
- **`exchangeCode(code)`** -- POST to token URL with Basic auth header, returns tokens + fetches `/v2/me` for account info
- **`refreshAccessToken(refreshToken)`** -- POST with grant_type=refresh_token (returns NEW refresh token that must be stored)
- **`browse(accessToken, path, page)`** -- hierarchical browsing:
  - No path: `GET /v2/me` then `GET /v2/accounts/{id}/teams` (list teams)
  - Path = `team:{id}`: `GET /v2/teams/{id}/projects`
  - Path = `project:{id}`: get project root asset, then `GET /v2/assets/{root_asset_id}/children`
  - Path = `folder:{id}`: `GET /v2/assets/{id}/children`
  - Returns items with `type`, `thumbnailUrl`, `metadata.label`, `metadata.comment_count`
- **`getAssetDetails(accessToken, assetId)`** -- `GET /v2/assets/{assetId}`
- **`createReviewLink(accessToken, assetIds, name)`** -- `POST /v2/projects/{project_id}/review_links`
- **`verifyWebhookSignature(payload, signature, timestamp)`** -- HMAC-SHA256 verification
- Includes pagination handling (page/page_size params)

**Commit:** `feat: add Frame.io V2 API provider client`

---

### Task 5: Token Refresh Utility

**Files:**
- Create: `src/lib/integrations/token-refresh.ts`

Utility that retrieves a valid access token, refreshing if needed:
- `getValidToken(userId: string, provider: IntegrationProvider): Promise<string>`
  - Reads integration from DB using Supabase service role client (bypasses RLS)
  - If `token_expires_at` is within 5 minutes of now, refresh the token
  - Decrypt token, refresh if needed, re-encrypt and update DB
  - Return the valid access token (decrypted, in memory only)

**Commit:** `feat: add automatic token refresh utility for integrations`

---

### Task 6: OAuth Authorization URL Endpoint

**Files:**
- Create: `src/app/api/v1/integrations/[provider]/auth-url/route.ts`

**GET `/api/v1/integrations/[provider]/auth-url`:**
- Requires authentication
- Validates provider from registry
- Generates `state` parameter: `base64(JSON.stringify({ userId, provider, nonce }))`
- Stores `nonce` in HttpOnly cookie for CSRF protection
- Returns `{ data: { url } }`

**Commit:** `feat: add OAuth authorization URL endpoint`

---

### Task 7: OAuth Callback Route

**Files:**
- Create: `src/app/auth/integrations/[provider]/callback/route.ts`

**GET `/auth/integrations/[provider]/callback`:**
- Reads `code` and `state` from query params
- Validates state (decode, verify nonce matches cookie)
- Calls `provider.exchangeCode(code)` to get tokens + account info
- Encrypts tokens using crypto utility
- Upserts into `user_integrations` (on conflict `user_id, provider`)
- Clears nonce cookie
- Redirects to `/app/settings/integrations?connected={provider}`

**Commit:** `feat: add OAuth callback handler for integration providers`

---

### Task 8: Integrations List + Disconnect API

**Files:**
- Create: `src/app/api/v1/integrations/route.ts`

**GET `/api/v1/integrations`:**
- Returns user's connected integrations (id, provider, account_name, account_email, account_avatar_url, created_at)
- Never returns tokens

**DELETE `/api/v1/integrations?provider=frame_io`:**
- Deletes the integration record for the given provider
- Returns 204

**Commit:** `feat: add integrations list and disconnect API`

---

### Task 9: Settings Page + Integrations UI

**Files:**
- Create: `src/app/app/settings/page.tsx`
- Create: `src/app/app/settings/integrations/page.tsx`
- Create: `src/components/integrations/connect-button.tsx`
- Create: `src/components/integrations/connected-account-card.tsx`
- Modify: `src/components/layout/sidebar.tsx` (add Settings link)

**Settings page (`/app/settings`):** Redirect to `/app/settings/integrations`.

**Integrations page:**
- Lists all available providers with connection status
- Connected: `ConnectedAccountCard` with account name, email, avatar, "Disconnect" button
- Not connected: `ConnectButton` that calls auth-url endpoint then redirects to OAuth
- Coming soon providers shown as disabled

**Commit:** `feat: add settings page with integrations management UI`

---

### Task 10: Frame.io Browse API Endpoint

**Files:**
- Create: `src/app/api/v1/integrations/[provider]/browse/route.ts`

**GET `/api/v1/integrations/[provider]/browse?path=&page=1`:**
- Requires authentication
- Calls `getValidToken(userId, provider)` for a fresh token
- Calls `provider.browse(token, path, page)`
- Returns `{ data: { items, breadcrumb, pagination } }`
- Path encoding: `team:abc123`, `project:def456`, `folder:ghi789`

**Commit:** `feat: add integration file browsing API endpoint`

---

### Task 11: File Picker Modal Component

**Files:**
- Create: `src/components/integrations/file-picker-modal.tsx`
- Create: `src/components/integrations/file-picker-breadcrumb.tsx`
- Create: `src/components/integrations/file-picker-item.tsx`

**FilePickerModal:**
- Props: `{ provider, open, onClose, onSelect }`
- Breadcrumb navigation at top
- Grid of items: folders are clickable navigation, files show thumbnail + name + size
- Click file to select, "Select" button confirms
- Fetches from `/api/v1/integrations/[provider]/browse?path=...`
- Reusable across providers

**Commit:** `feat: add reusable file picker modal for integration providers`

---

### Task 12: File References API

**Files:**
- Create: `src/app/api/v1/integrations/file-references/route.ts`
- Create: `src/app/api/v1/integrations/file-references/[referenceId]/route.ts`

**POST `/api/v1/integrations/file-references`:**
- Body: `{ provider, external_id, external_url, name, thumbnail_url, mime_type, file_size, duration_seconds, provider_metadata, episode_id?, deliverable_id? }`
- Validates at least one of episode_id or deliverable_id
- Logs activity: "Frame.io asset linked: {name}"

**GET `/api/v1/integrations/file-references?episode_id=&deliverable_id=`:**
- Returns file references for the given entity

**GET `/api/v1/integrations/file-references/[id]?refresh=true`:**
- Returns file reference, optionally refreshing metadata from provider

**DELETE `/api/v1/integrations/file-references/[id]`:**
- Removes the link (not the file on the provider)
- Logs activity

**Commit:** `feat: add file references CRUD API`

---

### Task 13: Link Frame.io Assets to Episodes

**Files:**
- Modify: `src/app/app/shows/[showId]/episodes/[episodeId]/page.tsx`
- Create: `src/components/integrations/linked-file-badge.tsx`

Add to the episode detail page:
- "Link Frame.io Asset" button (visible if frame_io integration is connected)
- Opens `FilePickerModal` with provider="frame_io"
- On select: POST to file-references API with episode_id
- Show linked file references as `LinkedFileBadge` components
- Each badge: thumbnail, asset name, label badge (approved/in_progress/etc.), comment count, external link
- "Unlink" action on each badge

**Commit:** `feat: add Frame.io asset linking to episode detail page`

---

### Task 14: Frame.io File Picker in Deliverable Form

**Files:**
- Modify: `src/components/deliverables/deliverable-form.tsx`

Update the deliverable form's "File URL" field:
- "Browse Frame.io" button next to URL input (if integration connected)
- Opens `FilePickerModal`, on select: populates file_url field
- Checks integration status on mount via `/api/v1/integrations`
- Falls back to manual URL input if no integration

**Commit:** `feat: add Frame.io file picker to deliverable submission form`

---

### Task 15: Create Review Link Endpoint + UI

**Files:**
- Create: `src/app/api/v1/integrations/[provider]/review-link/route.ts`
- Modify: `src/app/app/shows/[showId]/episodes/[episodeId]/page.tsx`

**POST `/api/v1/integrations/[provider]/review-link`:**
- Body: `{ asset_ids, name }`
- Gets valid token, calls `provider.createReviewLink(token, assetIds, name)`
- Returns `{ data: { url, name } }`

**UI:** "Create Review Link" button on episodes with linked Frame.io assets. Dialog to name the link and select assets. Result URL is copyable and optionally saved to episode's `frame_io_url`.

**Commit:** `feat: add Frame.io review link creation`

---

### Task 16: Frame.io Asset Status Display

**Files:**
- Modify: `src/components/integrations/linked-file-badge.tsx`

Enhance linked file badges with live status:
- On episode detail load, fetch file references with `?refresh=true`
- Display Frame.io label (none/in_progress/needs_review/approved) as colored badge
- Display comment count
- Show "last synced" timestamp

**Commit:** `feat: display Frame.io approval status and comment count on linked assets`

---

### Task 17: Webhook Ingress Endpoint

**Files:**
- Create: `src/app/api/v1/webhooks/[provider]/route.ts`

**POST `/api/v1/webhooks/[provider]`:**
- Public endpoint, signature-verified via HMAC-SHA256
- Inserts into `webhook_events` for audit
- Processes events:
  - `comment.created`: update file_reference comment count, log activity
  - `asset.ready`: update thumbnail_url
  - `asset.label.updated`: update label in provider_metadata, log activity
- Idempotency check via webhook_events
- Returns 200 immediately

**Commit:** `feat: add Frame.io webhook ingress with event processing`

---

### Task 18: Webhook Activity Log Integration

**Files:**
- Modify: `src/app/api/v1/webhooks/[provider]/route.ts`

When webhook events match a file_reference:
- Look up episode_id and show_id
- Insert into `activity_log` with Frame.io-specific actions
- Makes Frame.io activity visible in the client portal's activity feed

**Commit:** `feat: integrate Frame.io webhook events with activity log`

---

### Task 19: Provider Stubs for Future Integrations

**Files:**
- Create: `src/lib/integrations/providers/google-drive.ts`
- Create: `src/lib/integrations/providers/vimeo.ts`
- Create: `src/lib/integrations/providers/dropbox.ts`

Minimal stubs implementing the interface with "not yet available" errors. Include correct OAuth URLs in comments. Register in registry with `comingSoon: true`. Update integrations UI to show as "Coming Soon" with disabled connect buttons.

**Commit:** `feat: add provider stubs for Google Drive, Vimeo, and Dropbox`

---

### Task 20: Polish + Test Full Flow

**Steps:**
1. Test OAuth flow: settings -> connect -> authorize -> callback -> success
2. Test token refresh: expire token, verify auto-refresh
3. Test file picker: browse teams -> projects -> folders -> select asset
4. Test episode linking: link asset, verify badge with thumbnail + label
5. Test deliverable form: pick from Frame.io, verify URL populated
6. Test review link creation: create link, verify URL returned
7. Test webhook: simulate payload, verify activity log updated
8. Test disconnect: verify graceful handling of unlinked provider
9. Verify RLS: client portal can see file references but not browse API
10. Error states: expired tokens, revoked access, rate limiting

**Commit:** `fix: phase 3 polish and edge case handling`

---

## Security Considerations

1. **Token encryption at rest:** AES-256-GCM encryption via `INTEGRATION_ENCRYPTION_KEY` env var
2. **No client-side token exposure:** All provider API calls go through PreRoll server-side routes
3. **OAuth CSRF protection:** Nonce in HttpOnly cookie, verified on callback
4. **Webhook signature verification:** HMAC-SHA256 on all incoming webhooks
5. **Service role for token ops:** Token refresh uses Supabase service role (bypasses RLS)
6. **RLS on file_references:** Producer owns, clients get read-only via show ownership chain

---

## Future Considerations

- **Google Drive:** Same OAuth flow, browse via Drive API v3
- **Vimeo:** OAuth + browse + embed review links
- **Dropbox:** OAuth + browse + shared link generation
- **Bi-directional sync:** Push PreRoll status back to Frame.io labels
- **Bulk operations:** Link entire Frame.io folders to shows, auto-match by episode number
- **Realtime updates:** Supabase Realtime on file_references for live UI updates

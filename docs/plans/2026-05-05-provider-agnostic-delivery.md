# Provider-Agnostic Delivery Architecture

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Generalize the Frame.io-specific episode file management (routes, components, DB schema) into a provider-agnostic delivery system. Then implement Google Drive and Vimeo as alternate delivery providers. The end result: a producer can connect any supported provider and use it as the delivery target for an episode — same UX, different backend.

**Scope:** Delivery only. Ingest (receiving raw files from clients) is out of scope — handled by notes/links for now.

**Constraint:** Frame.io must continue working exactly as it does today throughout this migration. No regressions.

---

## Architecture Overview

```
Episode Detail Page
       │
       ▼
┌─────────────────────────┐
│  DeliveryPanel          │  (was: FrameIoPanel)
│  - provider-aware UI    │
│  - adapts to caps       │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  /api/v1/episodes/      │
│  [episodeId]/delivery/  │  (was: frameio-project, frameio-files, frameio-upload)
│  - route.ts (connect)   │
│  - files/route.ts       │
│  - upload/route.ts      │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  episode_integrations   │  (new table, replaces frameio_project_id columns)
│  - provider             │
│  - external_project_id  │
│  - external_folder_id   │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  IntegrationProviderClient              │
│  (existing interface — no changes)      │
├─────────────┬──────────────┬────────────┤
│  Frame.io   │ Google Drive │   Vimeo    │
│  (existing) │ (new)        │   (new)    │
└─────────────┴──────────────┴────────────┘
```

---

## Provider Capabilities Matrix

| Capability | Frame.io | Google Drive | Vimeo |
|-----------|----------|-------------|-------|
| `createProject` | Yes (project) | Yes (folder) | Yes (project) |
| `createFileUpload` | Yes (presigned S3 chunks) | Yes (resumable upload) | Yes (tus protocol) |
| `listFolderContents` | Yes | Yes | Yes |
| `createShare` | Yes (review link) | Yes (share link) | Yes (review page) |
| `browse` | Yes | Yes | Yes |
| Upload protocol | Presigned S3 PUT chunks | Single resumable URI | tus resumable |
| Auto-create on episode | Yes | Optional | Yes |

---

## Task 1: Database Migration — `episode_integrations` Table

**Goal:** Replace `episodes.frameio_project_id` / `frameio_root_folder_id` with a proper junction table that supports any provider.

**Files:**
- Create: `supabase/migrations/006_episode_integrations.sql`

**Migration SQL:**

```sql
-- Provider-agnostic link between episodes and delivery providers
CREATE TABLE episode_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id uuid REFERENCES episodes(id) ON DELETE CASCADE NOT NULL,
  provider integration_provider NOT NULL,
  external_project_id text,
  external_folder_id text,
  external_view_url text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  UNIQUE(episode_id, provider)
);

-- Index for fast lookups by episode
CREATE INDEX episode_integrations_episode_idx ON episode_integrations(episode_id);

-- RLS: same ownership chain as episodes
ALTER TABLE episode_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own episode integrations"
  ON episode_integrations
  FOR ALL
  USING (
    episode_id IN (
      SELECT e.id FROM episodes e
      JOIN shows s ON e.show_id = s.id
      JOIN clients c ON s.client_id = c.id
      WHERE c.user_id = auth.uid()
    )
  );

-- Migrate existing Frame.io data
INSERT INTO episode_integrations (episode_id, provider, external_project_id, external_folder_id)
SELECT id, 'frame_io', frameio_project_id, frameio_root_folder_id
FROM episodes
WHERE frameio_project_id IS NOT NULL;

-- Drop old columns (now redundant)
ALTER TABLE episodes DROP COLUMN IF EXISTS frameio_project_id;
ALTER TABLE episodes DROP COLUMN IF EXISTS frameio_root_folder_id;
```

**Commit:** `feat: add episode_integrations table, migrate frameio columns`

---

## Task 2: Provider Capabilities Declaration

**Goal:** Add a `capabilities` property to each provider so the UI can adapt without hardcoding provider names.

**Files:**
- Modify: `src/lib/integrations/types.ts`
- Modify: `src/lib/integrations/registry.ts`
- Modify: `src/lib/integrations/providers/frame-io.ts`

**Add to types.ts:**

```typescript
export interface ProviderCapabilities {
  canCreateProject: boolean
  canUpload: boolean
  canBrowse: boolean
  canShare: boolean
  uploadProtocol?: 'presigned-chunks' | 'resumable' | 'tus'
  projectLabel?: string  // "Project" for Frame.io, "Folder" for Drive, "Project" for Vimeo
}
```

**Add to IntegrationProviderClient interface:**

```typescript
readonly capabilities: ProviderCapabilities
```

**Add to Frame.io provider:**

```typescript
readonly capabilities: ProviderCapabilities = {
  canCreateProject: true,
  canUpload: true,
  canBrowse: true,
  canShare: true,
  uploadProtocol: 'presigned-chunks',
  projectLabel: 'Project',
}
```

**Add to registry ProviderEntry:**

```typescript
interface ProviderEntry {
  name: IntegrationProvider
  displayName: string
  comingSoon: boolean
  getClient: () => IntegrationProviderClient
  icon?: string  // provider icon identifier for UI
}
```

**Commit:** `feat: add provider capabilities declaration to integration types`

---

## Task 3: New API Routes — Provider-Agnostic Delivery Endpoints

**Goal:** Create new routes at `/api/v1/episodes/[episodeId]/delivery/` that look up the provider from `episode_integrations` and delegate to the correct provider client.

**Files:**
- Create: `src/app/api/v1/episodes/[episodeId]/delivery/route.ts`
- Create: `src/app/api/v1/episodes/[episodeId]/delivery/files/route.ts`
- Create: `src/app/api/v1/episodes/[episodeId]/delivery/upload/route.ts`

### `delivery/route.ts`

**GET** — Returns the episode's delivery integration (provider, project ID, view URL, capabilities).

**POST** — Connects/creates a delivery project for the episode.
- Request body: `{ provider?: IntegrationProvider }` (if omitted and only one provider connected, auto-selects; if multiple connected and omitted, returns 400 asking for provider)
- Logic:
  1. Authenticate, verify episode ownership
  2. If `episode_integrations` row exists → 409 conflict (no switching allowed)
  3. Determine provider: use body.provider, or auto-select if user has exactly one connected
  4. Get user's integration for the specified provider
  5. If provider supports `createProject`: call it, store result
  6. Insert into `episode_integrations`
  7. Return integration details + capabilities

### `delivery/files/route.ts`

**GET** — Lists files in the episode's delivery project.
- Query params: `cursor` (pagination)
- Logic:
  1. Authenticate, verify ownership
  2. Fetch `episode_integrations` row → get provider + external_folder_id
  3. Get token for that provider
  4. Call `provider.listFolderContents(token, accountId, folderId, cursor)`
  5. Return BrowseResult

### `delivery/upload/route.ts`

**POST** — Initiates file upload to the episode's delivery project.
- Request body: `{ name: string, file_size: number, mime_type?: string }`
- Response shape varies by `uploadProtocol`:
  - `presigned-chunks`: `{ fileId, uploadUrls: { url, size }[] }`
  - `resumable`: `{ fileId, resumableUrl: string }`
  - `tus`: `{ fileId, tusUrl: string }`
- Logic:
  1. Authenticate, verify ownership
  2. Fetch `episode_integrations` → get provider + external_folder_id
  3. Call `provider.createFileUpload(token, accountId, folderId, name, fileSize)`
  4. Return upload instructions

**Commit:** `feat: add provider-agnostic delivery API routes`

---

## Task 4: Migrate Old Routes to Delegate to New Routes

**Goal:** Keep `/frameio-project`, `/frameio-files`, `/frameio-upload` working but delegate to the new delivery routes internally. This avoids breaking the existing frontend while we migrate components.

**Files:**
- Modify: `src/app/api/v1/episodes/[episodeId]/frameio-project/route.ts`
- Modify: `src/app/api/v1/episodes/[episodeId]/frameio-files/route.ts`
- Modify: `src/app/api/v1/episodes/[episodeId]/frameio-upload/route.ts`

**Change:** Each old route imports and calls the handler from the new delivery route. Thin wrappers that pass through. This is temporary — removed in Task 9.

**Commit:** `refactor: delegate frameio-* routes to delivery routes`

---

## Task 5: Generalize the Deliverables Route

**Goal:** Replace `frameio_file_id` with `external_file_id` + `provider` in the deliverables POST body.

**Files:**
- Modify: `src/app/api/v1/deliverables/route.ts`

**Change:**
- Accept `external_file_id` and `provider` instead of `frameio_file_id`
- Keep `frameio_file_id` as a deprecated alias (maps to `external_file_id` + `provider: 'frame_io'`)
- Insert into `file_references` with the specified provider

**Commit:** `feat: generalize deliverables route to accept any provider file ID`

---

## Task 6: Generalize Episode Auto-Create

**Goal:** When creating an episode, auto-create a project on whatever delivery provider the user has connected (not just Frame.io).

**Files:**
- Modify: `src/app/api/v1/shows/[showId]/episodes/route.ts`

**Change:**
- Instead of checking specifically for `provider = 'frame_io'`, query for any connected integration where the provider supports `createProject`
- Priority order if multiple connected: Frame.io > Vimeo > Google Drive (configurable later)
- On success, insert into `episode_integrations` instead of updating episode columns
- Keep error handling: silent failure, episode still created

**Commit:** `feat: generalize episode auto-create to any delivery provider`

---

## Task 7: Rename and Generalize Components

**Goal:** Rename Frame.io-specific components to provider-agnostic names and make them capability-aware.

**Files:**
- Rename: `src/components/episodes/frameio-panel.tsx` → `src/components/episodes/delivery-panel.tsx`
- Rename: `src/components/episodes/frameio-uploader.tsx` → `src/components/episodes/file-uploader.tsx`
- Modify: `src/app/app/shows/[showId]/episodes/[episodeId]/page.tsx`

### `delivery-panel.tsx` (was `frameio-panel.tsx`)

**Props change:**
```typescript
interface DeliveryPanelProps {
  episodeId: string
  showId: string
  integration: {
    provider: IntegrationProvider
    externalProjectId: string | null
    externalFolderId: string | null
    externalViewUrl: string | null
  } | null
  deliverables: Deliverable[]
  connectedProviders: IntegrationProvider[]  // which providers user has connected
  episode: EpisodeMeta
}
```

**UI adaptations:**
- "Create Project" button label uses `capabilities.projectLabel` ("Create Frame.io Project" / "Create Drive Folder" / "Create Vimeo Project")
- "Open in Frame.io" → "Open in {displayName}"
- Upload zone only shown if `capabilities.canUpload`
- Provider logo/icon shown in header
- File list calls `/delivery/files` instead of `/frameio-files`
- Upload calls `/delivery/upload` instead of `/frameio-upload`
- Project creation calls `POST /delivery` instead of `/frameio-project`
- Submit deliverable sends `external_file_id` + `provider` instead of `frameio_file_id`

### `file-uploader.tsx` (was `frameio-uploader.tsx`)

**Props change:**
```typescript
interface FileUploaderProps {
  episodeId: string
  enabled: boolean
  uploadProtocol: 'presigned-chunks' | 'resumable' | 'tus'
  onUploadComplete: () => void
}
```

**Upload logic:**
- `presigned-chunks` (Frame.io): existing chunked PUT logic, unchanged
- `resumable` (Google Drive): single PUT to resumable URL with Content-Range header
- `tus` (Vimeo): tus.js client or manual tus protocol (PATCH with Upload-Offset)

### Episode detail page changes:
- Fetch `episode_integrations` row instead of `episode.frameio_project_id`
- Pass `integration` and `connectedProviders` props to `DeliveryPanel`
- Import from new component paths

**Commit:** `feat: rename and generalize delivery panel and uploader components`

---

## Task 8: Update Episode Detail Page Data Fetching

**Goal:** The server component fetches from `episode_integrations` and available providers instead of reading `frameio_project_id` columns.

**Files:**
- Modify: `src/app/app/shows/[showId]/episodes/[episodeId]/page.tsx`

**Change:**
```typescript
const [{ data: episode }, { data: deliverables }, { data: integration }, { data: connectedProviders }] = await Promise.all([
  supabase.from('episodes').select('*, pipeline_stages(id, name, position)').eq('id', episodeId).single(),
  supabase.from('deliverables').select('*').eq('episode_id', episodeId).order('created_at', { ascending: false }),
  supabase.from('episode_integrations').select('*').eq('episode_id', episodeId).maybeSingle(),
  supabase.from('user_integrations').select('provider').eq('user_id', user.id),
])
```

**Commit:** `feat: episode page fetches from episode_integrations table`

---

## Task 9: Remove Old Frame.io Routes

**Goal:** Delete the legacy `/frameio-project`, `/frameio-files`, `/frameio-upload` routes now that the frontend uses `/delivery/*`.

**Files:**
- Delete: `src/app/api/v1/episodes/[episodeId]/frameio-project/`
- Delete: `src/app/api/v1/episodes/[episodeId]/frameio-files/`
- Delete: `src/app/api/v1/episodes/[episodeId]/frameio-upload/`

**Commit:** `refactor: remove deprecated frameio-* episode routes`

---

## Task 10: Implement Google Drive Provider

**Goal:** Full OAuth + delivery implementation for Google Drive.

**Files:**
- Create: `src/lib/integrations/providers/google-drive.ts`
- Modify: `src/lib/integrations/init.ts` — register with `comingSoon: false`

**OAuth:**
- Auth URL: `https://accounts.google.com/o/oauth2/v2/auth`
- Token URL: `https://oauth2.googleapis.com/token`
- Scopes: `['openid', 'email', 'profile', 'https://www.googleapis.com/auth/drive']`
- Env vars: `GOOGLE_DRIVE_CLIENT_ID`, `GOOGLE_DRIVE_CLIENT_SECRET`

**Method implementations:**
- `exchangeCode`: Standard OAuth2 code exchange + fetch user profile from `https://www.googleapis.com/drive/v3/about?fields=user`
- `refreshAccessToken`: Standard refresh token flow
- `browse`: `GET /drive/v3/files?q=...` with folder navigation
- `getFileDetails`: `GET /drive/v3/files/{id}?fields=*`
- `createProject`: Creates a folder (`POST /drive/v3/files` with `mimeType: application/vnd.google-apps.folder`)
- `createFileUpload`: Initiates resumable upload (`POST /upload/drive/v3/files?uploadType=resumable`)
- `listFolderContents`: `GET /drive/v3/files?q='{folderId}' in parents`
- `createShare`: `POST /drive/v3/files/{id}/permissions` + return webViewLink

**Capabilities:**
```typescript
capabilities: {
  canCreateProject: true,
  canUpload: true,
  canBrowse: true,
  canShare: true,
  uploadProtocol: 'resumable',
  projectLabel: 'Folder',
}
```

**Commit:** `feat: implement Google Drive integration provider`

---

## Task 11: Implement Vimeo Provider

**Goal:** Full OAuth + delivery implementation for Vimeo.

**Files:**
- Create: `src/lib/integrations/providers/vimeo.ts`
- Modify: `src/lib/integrations/init.ts` — register with `comingSoon: false`

**OAuth:**
- Auth URL: `https://api.vimeo.com/oauth/authorize`
- Token URL: `https://api.vimeo.com/oauth/access_token`
- Scopes: `['private', 'video_files', 'upload', 'create']`
- Env vars: `VIMEO_CLIENT_ID`, `VIMEO_CLIENT_SECRET`

**Method implementations:**
- `exchangeCode`: Code exchange + `GET /me` for account info
- `refreshAccessToken`: Vimeo tokens don't expire by default — may need special handling
- `browse`: `GET /me/projects` (list projects) and `GET /me/projects/{id}/videos` (list videos)
- `getFileDetails`: `GET /videos/{id}`
- `createProject`: `POST /me/projects` with `{ name }`
- `createFileUpload`: `POST /me/videos` with `upload.approach: 'tus'` — returns `upload.upload_link`
- `listFolderContents`: `GET /me/projects/{id}/videos`
- `createShare`: `PATCH /videos/{id}` to set privacy + return link, or create review page

**Capabilities:**
```typescript
capabilities: {
  canCreateProject: true,
  canUpload: true,
  canBrowse: true,
  canShare: true,
  uploadProtocol: 'tus',
  projectLabel: 'Project',
}
```

**Commit:** `feat: implement Vimeo integration provider`

---

## Task 12: File Uploader — Multi-Protocol Support

**Goal:** Extend the upload component to handle resumable (Google Drive) and tus (Vimeo) protocols in addition to presigned chunks (Frame.io).

**Files:**
- Modify: `src/components/episodes/file-uploader.tsx`

**Add upload strategies:**

```typescript
// Presigned chunks (Frame.io) — existing logic
async function uploadPresignedChunks(file: File, uploadUrls: { url: string; size: number }[], onProgress)

// Resumable (Google Drive) — single PUT with Content-Range
async function uploadResumable(file: File, resumableUrl: string, onProgress)

// tus (Vimeo) — PATCH with Upload-Offset, chunked
async function uploadTus(file: File, tusUrl: string, onProgress)
```

The component reads `uploadProtocol` from props (passed down from DeliveryPanel based on provider capabilities) and dispatches to the correct strategy.

**Commit:** `feat: multi-protocol upload support (presigned, resumable, tus)`

---

## Implementation Order

```
Task 1  (DB migration)
  ↓
Task 2  (capabilities type)
  ↓
Task 3  (new delivery routes)
  ↓
Task 4  (old routes delegate — keeps frontend working)
  ↓
Task 5  (generalize deliverables route)
Task 6  (generalize episode auto-create)
  ↓  (parallel)
Task 7  (rename + generalize components)
Task 8  (update page data fetching)
  ↓
Task 9  (delete old routes)
  ↓
Task 10 (Google Drive provider)  ← parallel
Task 11 (Vimeo provider)         ← parallel
  ↓
Task 12 (multi-protocol uploader)
```

Tasks 1–4 are the safe migration path (nothing breaks).
Tasks 5–9 complete the generalization.
Tasks 10–12 add new providers.

---

## Testing Checklist

### Regression (Frame.io still works)
- [ ] Create episode → Frame.io project auto-created
- [ ] Episode page shows files from Frame.io project
- [ ] Upload file → appears in Frame.io
- [ ] Tag file as deliverable → deliverable created
- [ ] "Open in Frame.io" link works

### Provider-Agnostic
- [ ] `episode_integrations` row created on project creation
- [ ] Old `frameio_project_id` data migrated correctly
- [ ] Delivery routes work for Frame.io via new paths
- [ ] DeliveryPanel adapts label/icon per provider
- [ ] Manual deliverable form still works (no provider connected)

### Google Drive
- [ ] OAuth connect flow works
- [ ] Browse Drive folders in file picker
- [ ] Create episode → Drive folder auto-created
- [ ] Upload file to Drive folder
- [ ] Tag Drive file as deliverable
- [ ] Share link generated

### Vimeo
- [ ] OAuth connect flow works
- [ ] Browse Vimeo projects/videos
- [ ] Create episode → Vimeo project auto-created
- [ ] Upload video to Vimeo project
- [ ] Tag Vimeo video as deliverable
- [ ] Review page link generated

---

## Environment Variables Needed

```env
# Existing
FRAMEIO_CLIENT_ID=...
FRAMEIO_CLIENT_SECRET=...

# New — Google Drive
GOOGLE_DRIVE_CLIENT_ID=...
GOOGLE_DRIVE_CLIENT_SECRET=...

# New — Vimeo
VIMEO_CLIENT_ID=...
VIMEO_CLIENT_SECRET=...
```

---

## Resolved Decisions

1. **Provider picker on episode creation:** Auto-select if only one provider connected. Show picker if multiple are connected.

2. **Switching providers mid-episode:** Not allowed. One delivery provider per episode, locked on creation. The DELETE route on `/delivery` is removed — no disconnect. Files live on the provider they were uploaded to.

3. **Dropbox:** Keep the stub in the enum and init.ts as `comingSoon: true`. Zero cost, avoids a DB enum migration later.

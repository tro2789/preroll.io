# Unified Frame.io + Episode Integration

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** When a producer creates an episode, PreRoll auto-creates a Frame.io project. The episode page shows the project's files live, supports direct uploads to Frame.io, and lets the producer tag files as deliverables for client review — all in one unified flow.

**Architecture:** Episodes gain a direct link to a Frame.io project (`frameio_project_id`). The episode detail page replaces the separate "Linked Files" and "Deliverables" sections with a single unified panel that shows the Frame.io project contents, allows drag-and-drop uploads (browser → presigned S3 URLs, no server passthrough), and lets producers tag any file as a deliverable type for client review. The `file_references` table links individual Frame.io assets to deliverables when tagged.

**Tech Stack:** Next.js App Router, Supabase (Postgres + RLS), Frame.io V4 API (Adobe IMS OAuth), browser-side chunked uploads via presigned S3 URLs.

**V4 API Reference:** https://next.developer.frame.io/platform/v4/llms.txt — always verify endpoint paths against this.

---

## V4 API Endpoints Used

| Operation | Method | Path |
|-----------|--------|------|
| Create project | POST | `/v4/accounts/{account_id}/workspaces/{workspace_id}/projects` |
| Get project | GET | `/v4/accounts/{account_id}/projects/{project_id}` |
| List folder children | GET | `/v4/accounts/{account_id}/folders/{folder_id}/children` |
| Get file details | GET | `/v4/accounts/{account_id}/files/{file_id}` |
| Create local upload | POST | `/v4/accounts/{account_id}/folders/{folder_id}/files/local_upload` |
| Create share | POST | `/v4/accounts/{account_id}/projects/{project_id}/shares` |
| List workspaces | GET | `/v4/accounts/{account_id}/workspaces` |

**Request body pattern:** V4 wraps request bodies in `{ "data": { ... } }`.
**Response pattern:** V4 wraps responses in `{ "data": { ... } }` (single) or `{ "data": [...] }` (list).

---

## Task 1: Database Migration

**Goal:** Add Frame.io project columns to episodes, add workspace_id to user_integrations.

**Files:**
- Create: `supabase/migrations/005_episode_frameio_project.sql`

**Migration SQL:**

```sql
-- Link episodes to Frame.io projects
ALTER TABLE episodes ADD COLUMN frameio_project_id text;
ALTER TABLE episodes ADD COLUMN frameio_root_folder_id text;

-- Store workspace ID when user connects Frame.io (needed to create projects)
ALTER TABLE user_integrations ADD COLUMN workspace_id text;

-- Relax file_references constraint: allow linking without episode_id or deliverable_id
-- (files exist in the Frame.io project before being tagged as deliverables)
ALTER TABLE file_references DROP CONSTRAINT IF EXISTS file_references_check;
ALTER TABLE file_references ALTER COLUMN episode_id DROP NOT NULL;
```

**Apply:** Run via Supabase SQL Editor or MCP `apply_migration` tool.

**Commit:** `feat: add frameio_project_id to episodes schema`

---

## Task 2: Frame.io Client — Add createProject and createFileUpload

**Goal:** Add methods to the Frame.io provider for creating projects and initiating file uploads.

**Files:**
- Modify: `src/lib/integrations/types.ts` — add method signatures to interface
- Modify: `src/lib/integrations/providers/frame-io.ts` — implement methods

**Add to `IntegrationProviderClient` interface in types.ts:**

```typescript
createProject?(accessToken: string, accountId: string, workspaceId: string, name: string): Promise<{
  id: string
  rootFolderId: string
  viewUrl: string
}>

createFileUpload?(accessToken: string, accountId: string, folderId: string, fileName: string, fileSize: number): Promise<{
  fileId: string
  uploadUrls: { url: string; size: number }[]
}>

listFolderContents?(accessToken: string, accountId: string, folderId: string, cursor?: string): Promise<BrowseResult>
```

**Implement in frame-io.ts:**

`createProject`:
```typescript
async createProject(accessToken: string, accountId: string, workspaceId: string, name: string) {
  const res = await frameioFetch(`/accounts/${accountId}/workspaces/${workspaceId}/projects`, accessToken, {
    method: 'POST',
    body: JSON.stringify({ data: { name } }),
  })
  const project = res.data || res
  return {
    id: project.id,
    rootFolderId: project.root_folder_id,
    viewUrl: project.view_url,
  }
}
```

`createFileUpload`:
```typescript
async createFileUpload(accessToken: string, accountId: string, folderId: string, fileName: string, fileSize: number) {
  const res = await frameioFetch(`/accounts/${accountId}/folders/${folderId}/files/local_upload`, accessToken, {
    method: 'POST',
    body: JSON.stringify({ data: { name: fileName, file_size: fileSize } }),
  })
  const file = res.data || res
  return {
    fileId: file.id,
    uploadUrls: file.upload_urls,
  }
}
```

`listFolderContents`:
```typescript
async listFolderContents(accessToken: string, accountId: string, folderId: string, cursor?: string): Promise<BrowseResult> {
  let url = `/accounts/${accountId}/folders/${folderId}/children?page_size=50`
  if (cursor) url += `&after=${cursor}`

  const data = await frameioFetch(url, accessToken)
  const rawItems = data.data || data
  const items: BrowseItem[] = (Array.isArray(rawItems) ? rawItems : []).map((item: Record<string, unknown>) => ({
    id: item.id as string,
    name: item.name as string,
    type: (item.type === 'folder' ? 'folder' : 'file') as BrowseItem['type'],
    thumbnailUrl: (item.thumb_360 || item.thumb || item.thumbnail_url) as string | undefined,
    viewUrl: item.view_url as string | undefined,
    mimeType: item.media_type as string | undefined,
    fileSize: item.file_size as number | undefined,
    durationSeconds: item.duration as number | undefined,
    metadata: {
      label: item.label,
      comment_count: item.comment_count,
      status: item.status,
    },
  }))

  const nextCursor = data.links?.next as string | undefined
  return {
    items,
    breadcrumb: [],
    pagination: { cursor: nextCursor, hasMore: !!nextCursor },
  }
}
```

**Commit:** `feat: add createProject, createFileUpload, listFolderContents to Frame.io client`

---

## Task 3: Workspace Selection on Connect

**Goal:** When a user connects Frame.io, also store their default workspace ID (needed to create projects later).

**Files:**
- Modify: `src/app/auth/integrations/[provider]/callback/route.ts`

**Change:** After `exchangeCode` succeeds and before the upsert, fetch the user's workspaces and store the first one:

```typescript
// After: const result = await provider.exchangeCode(code, redirectUri)
// Before: await supabase.from('user_integrations').upsert(...)

let workspaceId: string | null = null
if (providerName === 'frame_io') {
  try {
    const { getValidTokenDirect } = await import('@/lib/integrations/token-refresh')
    const wsRes = await fetch(`https://api.frame.io/v4/accounts/${result.account.id}/workspaces`, {
      headers: { Authorization: `Bearer ${result.accessToken}` },
    })
    const wsJson = await wsRes.json()
    const workspaces = wsJson.data || wsJson
    if (Array.isArray(workspaces) && workspaces.length > 0) {
      workspaceId = workspaces[0].id
    }
  } catch {}
}
```

Add `workspace_id: workspaceId` to the upsert payload.

**Commit:** `feat: store workspace_id on Frame.io connect`

---

## Task 4: API Route — Create Frame.io Project for Episode

**Goal:** New API endpoint that creates a Frame.io project and links it to an episode.

**Files:**
- Create: `src/app/api/v1/episodes/[episodeId]/frameio-project/route.ts`

**POST handler:**
1. Authenticate user
2. Fetch episode (with show name, episode number) and verify ownership
3. Get Frame.io token, account_id, workspace_id via `getValidToken` / service client query
4. Call `provider.createProject(token, accountId, workspaceId, projectName)`
   - Project name format: `YYYY-MM-DD - {Show Name} - EP{number}`
   - Falls back to: `{Show Name} - {Episode Title}` if no episode number
5. Update episode: `SET frameio_project_id = project.id, frameio_root_folder_id = project.rootFolderId`
6. Log to activity_log
7. Return project details

**Commit:** `feat: add API route to create Frame.io project for episode`

---

## Task 5: API Route — List Episode's Frame.io Project Contents

**Goal:** Endpoint to list files in the episode's linked Frame.io project.

**Files:**
- Create: `src/app/api/v1/episodes/[episodeId]/frameio-files/route.ts`

**GET handler:**
1. Authenticate user
2. Fetch episode, verify it has `frameio_root_folder_id`
3. Get Frame.io token and account_id
4. Call `provider.listFolderContents(token, accountId, rootFolderId, cursor)`
5. Return the file list

**Commit:** `feat: add API route to list Frame.io project files for episode`

---

## Task 6: API Route — Initiate File Upload to Episode's Frame.io Project

**Goal:** Endpoint that creates a file placeholder in Frame.io and returns presigned upload URLs.

**Files:**
- Create: `src/app/api/v1/episodes/[episodeId]/frameio-upload/route.ts`

**POST handler:**
1. Authenticate user
2. Fetch episode, verify it has `frameio_root_folder_id`
3. Get Frame.io token and account_id
4. Call `provider.createFileUpload(token, accountId, rootFolderId, body.name, body.file_size)`
5. Return `{ fileId, uploadUrls }` — the browser handles the actual S3 uploads

**Commit:** `feat: add API route to initiate Frame.io upload for episode`

---

## Task 7: API Route — Tag Frame.io File as Deliverable

**Goal:** Single action to tag a Frame.io file from the project as a deliverable for client review.

**Files:**
- Modify: `src/app/api/v1/deliverables/route.ts` — extend POST to accept `frameio_file_id`

**Change to POST handler:** When `frameio_file_id` is provided in the body:
1. Create the deliverable as usual (with `file_url` set to the file's `view_url`)
2. Also create/upsert a `file_references` row linking `external_id = frameio_file_id` to both the `episode_id` and `deliverable_id`
3. This replaces the two-step "create deliverable + create file reference" pattern

**Commit:** `feat: tag Frame.io files as deliverables in single API call`

---

## Task 8: Episode Detail Page — Unified Frame.io Panel Component

**Goal:** Replace separate "Linked Files" and "Deliverables" sections with one unified panel.

**Files:**
- Create: `src/components/episodes/frameio-panel.tsx`
- Modify: `src/app/app/shows/[showId]/episodes/[episodeId]/page.tsx`

**The `FrameIoPanel` component shows:**

1. **Project status bar:**
   - If no project linked: "Create Frame.io Project" button
   - If linked: project name with "Open in Frame.io" link

2. **File list** (fetched from Task 5 API):
   - Each file shows: thumbnail, name, file size, duration (if video), Frame.io label badge
   - Each file has a "Submit for Review" dropdown with deliverable type options
   - Files already tagged as deliverables show the deliverable status badge (pending/approved/revision)

3. **Upload area:**
   - Drag-and-drop zone + file input
   - On drop: calls Task 6 API to get presigned URLs, then uploads chunks directly to S3 from browser
   - Shows upload progress per file
   - After upload completes, refreshes the file list

4. **Deliverable summary:**
   - Shows tagged deliverables with approval status
   - Client feedback visible inline on revision-requested items
   - Resubmit action available

**Episode detail page changes:**
- Remove `<EpisodeFileLinks>` component usage
- Replace `<EpisodeDeliverables>` with `<FrameIoPanel>`
- Pass: `episodeId`, `showId`, `episode` (for project ID), `deliverables`, `hasFrameIo`
- Keep the manual deliverable form as a fallback for non-Frame.io users

**Commit:** `feat: unified Frame.io panel on episode detail page`

---

## Task 9: Upload Component

**Goal:** Browser-side chunked upload to Frame.io presigned S3 URLs.

**Files:**
- Create: `src/components/episodes/frameio-uploader.tsx`

**Upload flow:**
1. User drops/selects files
2. For each file: `POST /api/v1/episodes/{id}/frameio-upload` with `{ name, file_size }`
3. Response: `{ fileId, uploadUrls: [{ url, size }] }`
4. For each chunk: `PUT` to presigned URL with headers `x-amz-acl: private` and `Content-Type: {mime}`
5. Track progress per file (bytes uploaded / total)
6. On complete: refresh file list

**Key constraints:**
- Uploads go browser → S3 directly (CORS allowed by Frame.io's presigned URLs)
- Chunk sizes are dictated by the `size` field in each upload URL
- Multiple files can upload concurrently (limit to 3 concurrent)

**Commit:** `feat: drag-and-drop Frame.io upload component`

---

## Task 10: Auto-Create Frame.io Project on Episode Creation

**Goal:** When a producer creates an episode and has Frame.io connected, auto-create the project.

**Files:**
- Modify: `src/app/api/v1/shows/[showId]/episodes/route.ts` — POST handler

**Change:** After the episode is inserted successfully:
1. Check if user has a Frame.io integration with `workspace_id` set
2. If yes: build project name from show name + episode number + date
3. Call the Frame.io `createProject` method
4. Update the episode with `frameio_project_id` and `frameio_root_folder_id`
5. If Frame.io project creation fails: log warning but don't fail the episode creation

**Commit:** `feat: auto-create Frame.io project on episode creation`

---

## Task 11: Cleanup

**Goal:** Remove dead code from the old dual-system approach.

**Files:**
- Delete: `src/components/integrations/episode-file-links.tsx`
- Delete: `src/components/deliverables/deliverable-form.tsx` (orphaned)
- Modify: `src/components/deliverables/episode-deliverables.tsx` — simplify to just the deliverable list (no more inline Frame.io picker)
- Remove the legacy `frame_io_url` display from the episode detail page (the project link replaces it)

**Commit:** `refactor: remove old dual linked-files and deliverables system`

---

## Task 12: Episode Form — Workspace Picker (Optional Override)

**Goal:** Let producers choose which workspace to create the Frame.io project in, if they have multiple.

**Files:**
- Modify: `src/components/episodes/episode-form.tsx`

**Change:** If user has Frame.io connected, show a small "Frame.io workspace" dropdown below the other fields. Default to the stored `workspace_id`. This allows overriding the default workspace for a specific episode.

**Commit:** `feat: optional workspace picker on episode creation form`

---

## Implementation Order

Tasks 1-3 are infrastructure (schema + client + auth). These must go first.
Tasks 4-6 are the API layer. These depend on 1-3.
Tasks 7-9 are the UI layer. These depend on 4-6.
Task 10 is the auto-creation glue. Depends on 4.
Tasks 11-12 are cleanup and polish.

**Recommended execution:** Tasks 1-7 sequentially, then 8-9 in parallel, then 10, then 11-12.

---

## Testing Checklist

- [ ] Connect Frame.io → workspace_id stored
- [ ] Create episode → Frame.io project auto-created with correct name format
- [ ] Episode page shows "Open in Frame.io" link
- [ ] Episode page lists Frame.io project files
- [ ] Drag-and-drop upload → file appears in Frame.io project
- [ ] Upload progress shows correctly for large files
- [ ] Tag file as deliverable → deliverable created with correct type and view_url
- [ ] Client portal shows deliverable for approval
- [ ] Client approves → status updates on episode page
- [ ] Revision requested → feedback visible, resubmit works
- [ ] Multiple concurrent uploads work
- [ ] User without Frame.io can still create deliverables manually
- [ ] Creating episode without Frame.io connected works normally (no project created)

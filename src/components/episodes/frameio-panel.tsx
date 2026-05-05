'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { DeliverableList } from '@/components/deliverables/deliverable-list'
import { FrameIoUploader } from './frameio-uploader'
import { getGradient } from '@/lib/ui/gradient'

interface Deliverable {
  id: string
  type: string
  title: string
  description: string | null
  file_url: string | null
  status: string
  reviewer_notes: string | null
  reviewed_at: string | null
  created_at: string
}

interface BrowseItem {
  id: string
  name: string
  type: 'folder' | 'file' | 'project' | 'workspace'
  thumbnailUrl?: string
  viewUrl?: string
  mimeType?: string
  fileSize?: number
  durationSeconds?: number
  metadata?: Record<string, unknown>
}

interface FrameIoPanelProps {
  episodeId: string
  showId: string
  frameioProjectId: string | null
  frameioRootFolderId: string | null
  deliverables: Deliverable[]
  hasFrameIo: boolean
}

const deliverableTypes = [
  { value: 'rough_cut', label: 'Rough Cut' },
  { value: 'final_cut', label: 'Final Cut' },
  { value: 'thumbnail', label: 'Thumbnail' },
  { value: 'show_notes', label: 'Show Notes' },
  { value: 'cover_art', label: 'Cover Art' },
  { value: 'intro', label: 'Intro' },
  { value: 'outro', label: 'Outro' },
  { value: 'social_clip', label: 'Social Clip' },
  { value: 'other', label: 'Other' },
]

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  const value = bytes / Math.pow(1024, i)
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

const statusStyles: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-amber-500/15', text: 'text-amber-400', label: 'Pending' },
  approved: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', label: 'Approved' },
  revision_requested: { bg: 'bg-red-500/15', text: 'text-red-400', label: 'Revision' },
}

const typeLabels: Record<string, string> = {
  rough_cut: 'Rough Cut',
  final_cut: 'Final Cut',
  thumbnail: 'Thumbnail',
  show_notes: 'Show Notes',
  cover_art: 'Cover Art',
  intro: 'Intro',
  outro: 'Outro',
  social_clip: 'Social Clip',
  other: 'Other',
}

export function FrameIoPanel({
  episodeId,
  showId,
  frameioProjectId: initialProjectId,
  frameioRootFolderId: initialRootFolderId,
  deliverables,
  hasFrameIo,
}: FrameIoPanelProps) {
  const router = useRouter()
  const [frameioProjectId, setFrameioProjectId] = useState(initialProjectId)
  const [frameioViewUrl, setFrameioViewUrl] = useState<string | null>(null)
  const [creatingProject, setCreatingProject] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const [files, setFiles] = useState<BrowseItem[]>([])
  const [filesLoading, setFilesLoading] = useState(false)
  const [filesError, setFilesError] = useState<string | null>(null)

  const [selectedTypes, setSelectedTypes] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const [showManualForm, setShowManualForm] = useState(false)
  const [manualTitle, setManualTitle] = useState('')
  const [manualType, setManualType] = useState('rough_cut')
  const [manualFileUrl, setManualFileUrl] = useState('')
  const [manualDescription, setManualDescription] = useState('')
  const [manualLoading, setManualLoading] = useState(false)
  const [manualError, setManualError] = useState<string | null>(null)

  const fetchFiles = useCallback(async () => {
    if (!frameioProjectId) return
    setFilesLoading(true)
    setFilesError(null)
    try {
      const res = await fetch(`/api/v1/episodes/${episodeId}/frameio-files`)
      if (!res.ok) {
        const json = await res.json().catch(() => ({ error: 'Failed to load files' }))
        throw new Error(json.error || `Failed to load files (${res.status})`)
      }
      const json = await res.json()
      setFiles(json.data?.items || [])
    } catch (err) {
      setFilesError(err instanceof Error ? err.message : 'Failed to load files')
    } finally {
      setFilesLoading(false)
    }
  }, [episodeId, frameioProjectId])

  useEffect(() => {
    if (frameioProjectId) fetchFiles()
  }, [frameioProjectId, fetchFiles])

  async function handleCreateProject() {
    setCreatingProject(true)
    setCreateError(null)
    try {
      const res = await fetch(`/api/v1/episodes/${episodeId}/frameio-project`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to create project')
      setFrameioProjectId(json.data?.frameio_project_id || null)
      setFrameioViewUrl(json.data?.frameio_view_url || null)
      router.refresh()
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create project')
    } finally {
      setCreatingProject(false)
    }
  }

  function isFileLinkedAsDeliverable(file: BrowseItem): Deliverable | null {
    return deliverables.find(
      (d) => d.file_url && (d.file_url.includes(file.id) || (file.viewUrl && d.file_url === file.viewUrl))
    ) || null
  }

  async function handleSubmitForReview(file: BrowseItem) {
    const type = selectedTypes[file.id] || 'rough_cut'
    setSubmitting(file.id)
    setSubmitError(null)
    try {
      const res = await fetch('/api/v1/deliverables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          show_id: showId,
          episode_id: episodeId,
          type,
          title: file.name,
          file_url: file.viewUrl || null,
          frameio_file_id: file.id,
        }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({ error: 'Failed to submit' }))
        throw new Error(json.error || 'Failed to submit deliverable')
      }
      router.refresh()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to submit')
    } finally {
      setSubmitting(null)
    }
  }

  function resetManualForm() {
    setManualTitle('')
    setManualType('rough_cut')
    setManualFileUrl('')
    setManualDescription('')
    setManualError(null)
    setShowManualForm(false)
  }

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault()
    setManualLoading(true)
    setManualError(null)
    try {
      const res = await fetch('/api/v1/deliverables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          show_id: showId,
          episode_id: episodeId,
          type: manualType,
          title: manualTitle,
          description: manualDescription || null,
          file_url: manualFileUrl || null,
        }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({ error: 'Failed to create' }))
        throw new Error(json.error || 'Failed to create deliverable')
      }
      resetManualForm()
      router.refresh()
    } catch (err) {
      setManualError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setManualLoading(false)
    }
  }

  // --- Render helpers ---

  function renderFileCard(file: BrowseItem) {
    const linked = isFileLinkedAsDeliverable(file)
    const style = linked ? statusStyles[linked.status] || statusStyles.pending : null

    return (
      <div key={file.id} className="group rounded-lg border border-border-subtle bg-surface-overlay overflow-hidden">
        {/* Thumbnail */}
        <a
          href={file.viewUrl || '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="block relative aspect-video overflow-hidden"
        >
          {file.thumbnailUrl ? (
            <img src={file.thumbnailUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full" style={{ background: getGradient(file.id) }} />
          )}
          {file.durationSeconds != null && file.durationSeconds > 0 && (
            <span className="absolute bottom-1.5 right-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white tabular-nums">
              {formatDuration(file.durationSeconds)}
            </span>
          )}
          {linked && style && (
            <span className={`absolute top-1.5 left-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${style.bg} ${style.text}`}>
              {style.label}
            </span>
          )}
        </a>

        {/* Info + actions */}
        <div className="p-2.5 space-y-2">
          <div>
            <p className="text-sm font-medium text-text-primary truncate" title={file.name}>{file.name}</p>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-text-tertiary">
              {file.fileSize != null && file.fileSize > 0 && <span>{formatFileSize(file.fileSize)}</span>}
              {linked && <span className="text-text-secondary">{typeLabels[linked.type] || linked.type}</span>}
            </div>
          </div>

          {!linked && (
            <div className="flex items-center gap-1.5">
              <select
                value={selectedTypes[file.id] || 'rough_cut'}
                onChange={(e) => setSelectedTypes((prev) => ({ ...prev, [file.id]: e.target.value }))}
                className="min-w-0 flex-1 rounded border border-border-default bg-surface-input px-1.5 py-1 text-xs text-text-primary focus:border-accent focus:outline-none"
              >
                {deliverableTypes.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <button
                onClick={() => handleSubmitForReview(file)}
                disabled={submitting === file.id}
                className="shrink-0 rounded bg-accent px-2 py-1 text-xs font-medium text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
              >
                {submitting === file.id ? '...' : 'Submit'}
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  function renderFileRow(file: BrowseItem) {
    const linked = isFileLinkedAsDeliverable(file)
    const style = linked ? statusStyles[linked.status] || statusStyles.pending : null

    return (
      <div key={file.id} className="flex items-center gap-3 rounded-lg border border-border-subtle bg-surface-overlay p-2">
        <a
          href={file.viewUrl || '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 block w-16 aspect-video rounded overflow-hidden"
        >
          {file.thumbnailUrl ? (
            <img src={file.thumbnailUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full" style={{ background: getGradient(file.id) }} />
          )}
        </a>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-text-primary">{file.name}</p>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-text-tertiary">
            {file.fileSize != null && file.fileSize > 0 && <span>{formatFileSize(file.fileSize)}</span>}
            {file.durationSeconds != null && file.durationSeconds > 0 && <span>{formatDuration(file.durationSeconds)}</span>}
            {linked && <span className="text-text-secondary">{typeLabels[linked.type] || linked.type}</span>}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {linked && style ? (
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}>{style.label}</span>
          ) : (
            <>
              <select
                value={selectedTypes[file.id] || 'rough_cut'}
                onChange={(e) => setSelectedTypes((prev) => ({ ...prev, [file.id]: e.target.value }))}
                className="rounded border border-border-default bg-surface-input px-1.5 py-1 text-xs text-text-primary focus:border-accent focus:outline-none"
              >
                {deliverableTypes.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <button
                onClick={() => handleSubmitForReview(file)}
                disabled={submitting === file.id}
                className="rounded bg-accent px-2 py-1 text-xs font-medium text-white hover:bg-accent-hover transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                {submitting === file.id ? '...' : 'Submit'}
              </button>
            </>
          )}
        </div>
      </div>
    )
  }

  // --- Main render ---

  return (
    <div className="space-y-5">
      {/* Project header bar */}
      {hasFrameIo && (
        <div className="flex items-center justify-between">
          {!frameioProjectId ? (
            <>
              <p className="text-sm text-text-secondary">No Frame.io project linked.</p>
              <button
                onClick={handleCreateProject}
                disabled={creatingProject}
                className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
              >
                {creatingProject ? 'Creating...' : 'Create Project'}
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <h3 className="text-xs font-medium uppercase tracking-wider text-text-tertiary">Files</h3>
                {files.length > 0 && (
                  <span className="text-xs text-text-tertiary">{files.length}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {/* View toggle */}
                <div className="flex items-center rounded-md border border-border-subtle overflow-hidden">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`px-2 py-1 transition-colors ${viewMode === 'grid' ? 'bg-surface-overlay text-text-primary' : 'text-text-tertiary hover:text-text-secondary'}`}
                    title="Grid view"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                      <path d="M1 2.75A1.75 1.75 0 0 1 2.75 1h2.5A1.75 1.75 0 0 1 7 2.75v2.5A1.75 1.75 0 0 1 5.25 7h-2.5A1.75 1.75 0 0 1 1 5.25v-2.5ZM9 2.75A1.75 1.75 0 0 1 10.75 1h2.5A1.75 1.75 0 0 1 15 2.75v2.5A1.75 1.75 0 0 1 13.25 7h-2.5A1.75 1.75 0 0 1 9 5.25v-2.5ZM1 10.75A1.75 1.75 0 0 1 2.75 9h2.5A1.75 1.75 0 0 1 7 10.75v2.5A1.75 1.75 0 0 1 5.25 15h-2.5A1.75 1.75 0 0 1 1 13.25v-2.5ZM9 10.75A1.75 1.75 0 0 1 10.75 9h2.5A1.75 1.75 0 0 1 15 10.75v2.5A1.75 1.75 0 0 1 13.25 15h-2.5A1.75 1.75 0 0 1 9 13.25v-2.5Z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`px-2 py-1 transition-colors ${viewMode === 'list' ? 'bg-surface-overlay text-text-primary' : 'text-text-tertiary hover:text-text-secondary'}`}
                    title="List view"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                      <path fillRule="evenodd" d="M2 4a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4Zm0 4a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 8Zm0 4a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 12Z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
                <button
                  onClick={fetchFiles}
                  disabled={filesLoading}
                  className="text-xs text-text-tertiary hover:text-text-primary transition-colors disabled:opacity-50"
                >
                  {filesLoading ? 'Loading...' : 'Refresh'}
                </button>
                {frameioViewUrl && (
                  <a
                    href={frameioViewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-accent hover:text-accent-hover transition-colors"
                  >
                    Open in Frame.io
                  </a>
                )}
              </div>
            </>
          )}
          {createError && (
            <p className="text-xs text-error">{createError}</p>
          )}
        </div>
      )}

      {/* Error states */}
      {filesError && (
        <div className="rounded-md bg-error/10 border border-error/30 px-3 py-2 text-xs text-error">{filesError}</div>
      )}
      {submitError && (
        <div className="rounded-md bg-error/10 border border-error/30 px-3 py-2 text-xs text-error">{submitError}</div>
      )}

      {/* File grid or list */}
      {frameioProjectId && !filesLoading && files.length > 0 && (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
            {files.map(renderFileCard)}
          </div>
        ) : (
          <div className="space-y-1.5">
            {files.map(renderFileRow)}
          </div>
        )
      )}

      {/* Loading skeleton */}
      {frameioProjectId && filesLoading && files.length === 0 && (
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-lg border border-border-subtle bg-surface-overlay overflow-hidden animate-pulse">
              <div className="aspect-video bg-surface-raised" />
              <div className="p-2.5 space-y-2">
                <div className="h-4 w-3/4 rounded bg-surface-raised" />
                <div className="h-3 w-1/2 rounded bg-surface-raised" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {frameioProjectId && !filesLoading && files.length === 0 && !filesError && (
        <p className="py-4 text-center text-xs text-text-tertiary">
          No files yet. Upload your first file below.
        </p>
      )}

      {/* Upload zone */}
      {frameioProjectId && (
        <FrameIoUploader episodeId={episodeId} onUploadComplete={fetchFiles} />
      )}

      {/* Deliverables section */}
      {deliverables.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
              Deliverables
              <span className="ml-1 normal-case tracking-normal">({deliverables.length})</span>
            </h3>
            {!showManualForm && (
              <button
                onClick={() => setShowManualForm(true)}
                className="text-xs text-text-tertiary hover:text-text-primary transition-colors"
              >
                + Manual
              </button>
            )}
          </div>
          <DeliverableList deliverables={deliverables} />
        </div>
      )}

      {/* Manual form fallback (shown when no deliverables exist or explicitly opened) */}
      {deliverables.length === 0 && !hasFrameIo && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-medium uppercase tracking-wider text-text-tertiary">Deliverables</h3>
            {!showManualForm && (
              <button
                onClick={() => setShowManualForm(true)}
                className="text-xs text-text-tertiary hover:text-text-primary transition-colors"
              >
                + Manual
              </button>
            )}
          </div>
          {!showManualForm && (
            <p className="py-4 text-center text-xs text-text-tertiary">No deliverables submitted yet.</p>
          )}
        </div>
      )}

      {showManualForm && (
        <form onSubmit={handleManualSubmit} className="rounded-lg border border-border-subtle bg-surface-overlay p-4 space-y-3">
          {manualError && (
            <div className="rounded-md bg-error/10 border border-error/30 px-3 py-2 text-xs text-error">{manualError}</div>
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="manual-title" className="block text-xs font-medium text-text-secondary mb-1">Title</label>
              <input
                id="manual-title"
                type="text"
                value={manualTitle}
                onChange={(e) => setManualTitle(e.target.value)}
                required
                className="block w-full rounded-md border border-border-default bg-surface-input px-3 py-1.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
                placeholder="Episode 5 Rough Cut"
              />
            </div>
            <div>
              <label htmlFor="manual-type" className="block text-xs font-medium text-text-secondary mb-1">Type</label>
              <select
                id="manual-type"
                value={manualType}
                onChange={(e) => setManualType(e.target.value)}
                className="block w-full rounded-md border border-border-default bg-surface-input px-3 py-1.5 text-sm text-text-primary focus:border-accent focus:outline-none"
              >
                {deliverableTypes.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="manual-url" className="block text-xs font-medium text-text-secondary mb-1">File URL</label>
            <input
              id="manual-url"
              type="url"
              value={manualFileUrl}
              onChange={(e) => setManualFileUrl(e.target.value)}
              className="block w-full rounded-md border border-border-default bg-surface-input px-3 py-1.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
              placeholder="https://..."
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={manualLoading || !manualTitle.trim()}
              className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
            >
              {manualLoading ? 'Submitting...' : 'Submit for Review'}
            </button>
            <button type="button" onClick={resetManualForm} className="text-xs text-text-tertiary hover:text-text-secondary transition-colors">
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

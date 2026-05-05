'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { DeliverableList } from '@/components/deliverables/deliverable-list'
import { FrameIoUploader } from './frameio-uploader'

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
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${m}:${String(s).padStart(2, '0')}`
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

  // Manual deliverable form
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
    if (frameioProjectId) {
      fetchFiles()
    }
  }, [frameioProjectId, fetchFiles])

  async function handleCreateProject() {
    setCreatingProject(true)
    setCreateError(null)
    try {
      const res = await fetch(`/api/v1/episodes/${episodeId}/frameio-project`, {
        method: 'POST',
      })
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error || 'Failed to create project')
      }
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
    return (
      deliverables.find(
        (d) =>
          d.file_url &&
          (d.file_url.includes(file.id) || (file.viewUrl && d.file_url === file.viewUrl))
      ) || null
    )
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

  const statusStyles: Record<string, { bg: string; text: string; label: string }> = {
    pending: { bg: 'bg-amber-500/15', text: 'text-amber-400', label: 'Pending' },
    approved: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', label: 'Approved' },
    revision_requested: { bg: 'bg-red-500/15', text: 'text-red-400', label: 'Needs Revision' },
  }

  return (
    <div className="space-y-6">
      {/* Section A: Project Header */}
      {hasFrameIo && (
        <div className="rounded-lg border border-border-subtle bg-surface-raised p-4">
          {!frameioProjectId ? (
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
                  Frame.io Project
                </h3>
                <p className="mt-1 text-sm text-text-secondary">
                  No project linked. Create one to upload and manage files.
                </p>
              </div>
              <button
                onClick={handleCreateProject}
                disabled={creatingProject}
                className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
              >
                {creatingProject ? 'Creating...' : 'Create Frame.io Project'}
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
                Frame.io Project
              </h3>
              {frameioViewUrl && (
                <a
                  href={frameioViewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-accent hover:text-accent-hover transition-colors font-medium"
                >
                  Open in Frame.io
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                    className="h-3 w-3"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.22 11.78a.75.75 0 0 1 0-1.06L9.44 5.5H5.75a.75.75 0 0 1 0-1.5h5.5a.75.75 0 0 1 .75.75v5.5a.75.75 0 0 1-1.5 0V6.56l-5.22 5.22a.75.75 0 0 1-1.06 0Z"
                      clipRule="evenodd"
                    />
                  </svg>
                </a>
              )}
            </div>
          )}
          {createError && (
            <div className="mt-2 rounded-md bg-error/10 border border-error/30 px-3 py-2 text-xs text-error">
              {createError}
            </div>
          )}
        </div>
      )}

      {/* Section B: File List + Upload (only if project exists) */}
      {frameioProjectId && (
        <div className="rounded-lg border border-border-subtle bg-surface-raised p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
              Files
              {files.length > 0 && (
                <span className="ml-1 normal-case tracking-normal">({files.length})</span>
              )}
            </h3>
            <button
              onClick={fetchFiles}
              disabled={filesLoading}
              className="text-xs text-text-secondary hover:text-text-primary transition-colors font-medium disabled:opacity-50"
            >
              {filesLoading ? 'Loading...' : 'Refresh'}
            </button>
          </div>

          {filesError && (
            <div className="rounded-md bg-error/10 border border-error/30 px-3 py-2 text-xs text-error">
              {filesError}
            </div>
          )}

          {submitError && (
            <div className="rounded-md bg-error/10 border border-error/30 px-3 py-2 text-xs text-error">
              {submitError}
            </div>
          )}

          {/* File rows */}
          {!filesLoading && files.length > 0 && (
            <div className="space-y-2">
              {files.map((file) => {
                const linkedDeliverable = isFileLinkedAsDeliverable(file)
                const style = linkedDeliverable
                  ? statusStyles[linkedDeliverable.status] || statusStyles.pending
                  : null

                return (
                  <div
                    key={file.id}
                    className="flex items-center gap-3 rounded-lg border border-border-subtle bg-surface-overlay p-3"
                  >
                    {/* Thumbnail */}
                    {file.thumbnailUrl ? (
                      <img
                        src={file.thumbnailUrl}
                        alt=""
                        className="h-10 w-10 shrink-0 rounded object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-surface-raised">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          className="h-5 w-5 text-text-tertiary"
                        >
                          <path d="M3 3.5A1.5 1.5 0 0 1 4.5 2h6.879a1.5 1.5 0 0 1 1.06.44l4.122 4.12A1.5 1.5 0 0 1 17 7.622V16.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 16.5v-13Z" />
                        </svg>
                      </div>
                    )}

                    {/* File info */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-text-primary">{file.name}</p>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-text-tertiary">
                        {file.fileSize != null && file.fileSize > 0 && (
                          <span>{formatFileSize(file.fileSize)}</span>
                        )}
                        {file.durationSeconds != null && file.durationSeconds > 0 && (
                          <span>{formatDuration(file.durationSeconds)}</span>
                        )}
                      </div>
                    </div>

                    {/* Action: status badge or type selector + submit */}
                    <div className="flex shrink-0 items-center gap-2">
                      {linkedDeliverable && style ? (
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}
                        >
                          {style.label}
                        </span>
                      ) : (
                        <>
                          <select
                            value={selectedTypes[file.id] || 'rough_cut'}
                            onChange={(e) =>
                              setSelectedTypes((prev) => ({
                                ...prev,
                                [file.id]: e.target.value,
                              }))
                            }
                            className="rounded-md border border-border-default bg-surface-input px-2 py-1 text-xs text-text-primary focus:border-accent focus:outline-none"
                          >
                            {deliverableTypes.map((t) => (
                              <option key={t.value} value={t.value}>
                                {t.label}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleSubmitForReview(file)}
                            disabled={submitting === file.id}
                            className="rounded-md bg-accent px-2.5 py-1 text-xs font-medium text-white hover:bg-accent-hover transition-colors disabled:opacity-50 whitespace-nowrap"
                          >
                            {submitting === file.id ? 'Submitting...' : 'Submit for Review'}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Empty state */}
          {!filesLoading && files.length === 0 && !filesError && (
            <p className="py-2 text-center text-xs text-text-tertiary">
              No files uploaded yet. Drag and drop files above to upload.
            </p>
          )}

          {/* Loading state */}
          {filesLoading && files.length === 0 && (
            <p className="py-2 text-center text-xs text-text-tertiary">Loading files...</p>
          )}

          {/* Upload drop zone */}
          <FrameIoUploader episodeId={episodeId} onUploadComplete={fetchFiles} />
        </div>
      )}

      {/* Section C: Deliverables */}
      <div className="rounded-lg border border-border-subtle bg-surface-raised p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
            Deliverables
            {deliverables.length > 0 && (
              <span className="ml-1 normal-case tracking-normal">({deliverables.length})</span>
            )}
          </h3>
          {!showManualForm && (
            <button
              onClick={() => setShowManualForm(true)}
              className="text-xs text-text-secondary hover:text-text-primary transition-colors font-medium"
            >
              + Manual
            </button>
          )}
        </div>

        {/* Manual deliverable form */}
        {showManualForm && (
          <form
            onSubmit={handleManualSubmit}
            className="rounded-lg border border-accent/30 bg-surface-overlay p-4 space-y-3"
          >
            {manualError && (
              <div className="rounded-md bg-error/10 border border-error/30 px-3 py-2 text-xs text-error">
                {manualError}
              </div>
            )}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="manual-title" className="block text-xs font-medium text-text-secondary mb-1">
                  Title
                </label>
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
                <label htmlFor="manual-type" className="block text-xs font-medium text-text-secondary mb-1">
                  Type
                </label>
                <select
                  id="manual-type"
                  value={manualType}
                  onChange={(e) => setManualType(e.target.value)}
                  className="block w-full rounded-md border border-border-default bg-surface-input px-3 py-1.5 text-sm text-text-primary focus:border-accent focus:outline-none"
                >
                  {deliverableTypes.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label htmlFor="manual-url" className="block text-xs font-medium text-text-secondary mb-1">
                File URL
              </label>
              <input
                id="manual-url"
                type="url"
                value={manualFileUrl}
                onChange={(e) => setManualFileUrl(e.target.value)}
                className="block w-full rounded-md border border-border-default bg-surface-input px-3 py-1.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
                placeholder="https://..."
              />
            </div>
            <div>
              <label htmlFor="manual-desc" className="block text-xs font-medium text-text-secondary mb-1">
                Notes for client
              </label>
              <textarea
                id="manual-desc"
                value={manualDescription}
                onChange={(e) => setManualDescription(e.target.value)}
                rows={2}
                className="block w-full rounded-md border border-border-default bg-surface-input px-3 py-1.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none resize-none"
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
              <button
                type="button"
                onClick={resetManualForm}
                className="text-xs text-text-tertiary hover:text-text-secondary transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <DeliverableList deliverables={deliverables} />

        {deliverables.length === 0 && !showManualForm && (
          <p className="py-2 text-center text-xs text-text-tertiary">
            No deliverables submitted yet.
          </p>
        )}
      </div>
    </div>
  )
}

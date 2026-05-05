'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { DeliverableList } from '@/components/deliverables/deliverable-list'
import { FileUploader } from './file-uploader'
import { getGradient } from '@/lib/ui/gradient'
import type { IntegrationProvider } from '@/lib/integrations/types'

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
  createdAt?: string
  metadata?: Record<string, unknown>
}

interface EpisodeMeta {
  scheduled_publish_date: string | null
  published_at: string | null
  description: string | null
  notes: string | null
  stage: { name: string } | null
}

interface DeliveryIntegration {
  provider: IntegrationProvider
  externalProjectId: string | null
  externalFolderId: string | null
  externalViewUrl: string | null
  displayName: string
}

interface DeliveryPanelProps {
  episodeId: string
  showId: string
  integration: DeliveryIntegration | null
  deliverables: Deliverable[]
  connectedProviders: IntegrationProvider[]
  episode: EpisodeMeta
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
  rough_cut: 'Rough Cut', final_cut: 'Final Cut', thumbnail: 'Thumbnail',
  show_notes: 'Show Notes', cover_art: 'Cover Art', intro: 'Intro',
  outro: 'Outro', social_clip: 'Social Clip', other: 'Other',
}

export function DeliveryPanel({
  episodeId, showId, integration: initialIntegration,
  deliverables, connectedProviders, episode,
}: DeliveryPanelProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [integration, setIntegration] = useState(initialIntegration)
  const [creatingProject, setCreatingProject] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const [files, setFiles] = useState<BrowseItem[]>([])
  const [filesLoading, setFilesLoading] = useState(false)
  const [filesError, setFilesError] = useState<string | null>(null)

  const [selectedTypes, setSelectedTypes] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const [sortKey, setSortKey] = useState<'name' | 'size' | 'type' | 'date'>('date')
  const [sortAsc, setSortAsc] = useState(false)

  const [showManualForm, setShowManualForm] = useState(false)
  const [manualTitle, setManualTitle] = useState('')
  const [manualType, setManualType] = useState('rough_cut')
  const [manualFileUrl, setManualFileUrl] = useState('')
  const [manualLoading, setManualLoading] = useState(false)
  const [manualError, setManualError] = useState<string | null>(null)

  const hasProject = !!integration?.externalProjectId
  const hasProvider = connectedProviders.length > 0
  const providerConnected = !!integration && connectedProviders.includes(integration.provider)
  const isLive = hasProject && providerConnected
  const providerDisplayName = integration?.displayName || 'Provider'

  const fetchFiles = useCallback(async () => {
    if (!isLive) return
    setFilesLoading(true)
    setFilesError(null)
    try {
      const res = await fetch(`/api/v1/episodes/${episodeId}/delivery/files`)
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
  }, [episodeId, isLive])

  useEffect(() => {
    if (isLive) fetchFiles()
  }, [isLive, fetchFiles])

  async function handleCreateProject() {
    setCreatingProject(true)
    setCreateError(null)
    try {
      const res = await fetch(`/api/v1/episodes/${episodeId}/delivery`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to create project')
      const data = json.data?.integration || json.data
      setIntegration({
        provider: data.provider,
        externalProjectId: data.external_project_id,
        externalFolderId: data.external_folder_id,
        externalViewUrl: data.external_view_url,
        displayName: data.display_name || data.provider,
      })
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
          show_id: showId, episode_id: episodeId, type,
          title: file.name, file_url: file.viewUrl || null,
          external_file_id: file.id,
          provider: integration?.provider,
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
          show_id: showId, episode_id: episodeId, type: manualType,
          title: manualTitle, file_url: manualFileUrl || null,
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

  function renderFileCard(file: BrowseItem) {
    const linked = isFileLinkedAsDeliverable(file)
    const style = linked ? statusStyles[linked.status] || statusStyles.pending : null

    return (
      <div key={file.id} className="rounded-lg border border-border-subtle bg-surface-overlay overflow-hidden">
        <a href={file.viewUrl || '#'} target="_blank" rel="noopener noreferrer" className="block relative aspect-video overflow-hidden">
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
        <div className="p-2.5 space-y-2">
          <div>
            <p className="text-sm font-medium text-text-primary truncate" title={file.name}>{file.name}</p>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-text-tertiary">
              {file.fileSize != null && file.fileSize > 0 && <span>{formatFileSize(file.fileSize)}</span>}
              <span>&middot; {getFileExt(file.name)}</span>
              {file.createdAt && (
                <span>&middot; {new Date(file.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              )}
              {linked && <span className="text-text-secondary">&middot; {typeLabels[linked.type] || linked.type}</span>}
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

  function getFileExt(name: string): string {
    const dot = name.lastIndexOf('.')
    return dot >= 0 ? name.substring(dot + 1).toUpperCase() : '—'
  }

  function handleSort(key: typeof sortKey) {
    if (sortKey === key) {
      setSortAsc(!sortAsc)
    } else {
      setSortKey(key)
      setSortAsc(key === 'name')
    }
  }

  function getSortedFiles(): BrowseItem[] {
    const sorted = [...files].sort((a, b) => {
      switch (sortKey) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'size':
          return (a.fileSize || 0) - (b.fileSize || 0)
        case 'type':
          return getFileExt(a.name).localeCompare(getFileExt(b.name))
        case 'date':
          return (a.createdAt || '').localeCompare(b.createdAt || '')
        default:
          return 0
      }
    })
    return sortAsc ? sorted : sorted.reverse()
  }

  function SortHeader({ label, column, width }: { label: string; column: typeof sortKey; width: string }) {
    const active = sortKey === column
    return (
      <th className={`pb-2 pr-3 font-medium ${width}`}>
        <button
          onClick={() => handleSort(column)}
          className={`inline-flex items-center gap-1 transition-colors ${active ? 'text-text-primary' : 'text-text-tertiary hover:text-text-secondary'}`}
        >
          {label}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" fill="currentColor" className={`h-3 w-3 transition-transform ${active && sortAsc ? 'rotate-180' : ''}`}>
            <path d="M6 8.25a.75.75 0 0 1-.53-.22l-2.5-2.5a.75.75 0 1 1 1.06-1.06L6 6.44l1.97-1.97a.75.75 0 1 1 1.06 1.06l-2.5 2.5a.75.75 0 0 1-.53.22Z" />
          </svg>
        </button>
      </th>
    )
  }

  function renderFileTable() {
    const sorted = getSortedFiles()

    return (
      <table className="w-full text-left">
        <thead>
          <tr className="text-xs font-medium border-b border-border-subtle">
            <SortHeader label="Name" column="name" width="" />
            <SortHeader label="Size" column="size" width="w-20" />
            <SortHeader label="Type" column="type" width="w-16" />
            <SortHeader label="Uploaded" column="date" width="w-20" />
            <th className="pb-2 font-medium w-48 text-right text-text-tertiary">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-subtle">
          {sorted.map((file) => {
            const linked = isFileLinkedAsDeliverable(file)
            const style = linked ? statusStyles[linked.status] || statusStyles.pending : null

            return (
              <tr key={file.id} className="group">
                <td className="py-2 pr-3">
                  <div className="flex items-center gap-3">
                    <a href={file.viewUrl || '#'} target="_blank" rel="noopener noreferrer" className="shrink-0 block w-14 aspect-video rounded overflow-hidden">
                      {file.thumbnailUrl ? (
                        <img src={file.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full" style={{ background: getGradient(file.id) }} />
                      )}
                    </a>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-text-primary">{file.name}</p>
                      {linked && <p className="text-xs text-text-secondary">{typeLabels[linked.type] || linked.type}</p>}
                    </div>
                  </div>
                </td>
                <td className="py-2 pr-3 text-xs text-text-tertiary tabular-nums">
                  {file.fileSize != null && file.fileSize > 0 ? formatFileSize(file.fileSize) : '—'}
                </td>
                <td className="py-2 pr-3 text-xs text-text-tertiary">
                  {getFileExt(file.name)}
                </td>
                <td className="py-2 pr-3 text-xs text-text-tertiary">
                  {file.createdAt ? new Date(file.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                </td>
                <td className="py-2 text-right">
                  {linked && style ? (
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}>{style.label}</span>
                  ) : (
                    <div className="flex items-center justify-end gap-1.5">
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
                    </div>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    )
  }

  return (
    <>
      <FileUploader episodeId={episodeId} enabled={isLive} onUploadComplete={fetchFiles} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_260px]">
        {/* Main: files */}
        <div className="min-w-0 space-y-4">
          {/* Header bar */}
          {hasProvider && (
            <div className="flex items-center justify-between">
              {!hasProject ? (
                <>
                  <p className="text-sm text-text-secondary">No delivery project linked.</p>
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
                    {files.length > 0 && <span className="text-xs text-text-tertiary">{files.length}</span>}
                  </div>
                  <div className="flex items-center gap-2">
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
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs text-text-tertiary hover:text-text-primary transition-colors"
                    >
                      Upload
                    </button>
                    <button
                      onClick={fetchFiles}
                      disabled={filesLoading}
                      className="text-xs text-text-tertiary hover:text-text-primary transition-colors disabled:opacity-50"
                    >
                      Refresh
                    </button>
                    {integration?.externalViewUrl && (
                      <a href={integration.externalViewUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:text-accent-hover transition-colors">
                        {providerDisplayName}
                      </a>
                    )}
                  </div>
                </>
              )}
              {createError && <p className="text-xs text-error">{createError}</p>}
            </div>
          )}

          {filesError && <div className="rounded-md bg-error/10 border border-error/30 px-3 py-2 text-xs text-error">{filesError}</div>}
          {submitError && <div className="rounded-md bg-error/10 border border-error/30 px-3 py-2 text-xs text-error">{submitError}</div>}

          {/* File grid or list */}
          {isLive && !filesLoading && files.length > 0 && (
            viewMode === 'grid' ? (
              <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
                {files.map(renderFileCard)}
              </div>
            ) : (
              renderFileTable()
            )
          )}

          {/* Loading skeleton */}
          {isLive && filesLoading && files.length === 0 && (
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

          {/* Empty state — project linked and provider connected */}
          {isLive && !filesLoading && files.length === 0 && !filesError && (
            <div className="py-12 text-center">
              <p className="text-sm text-text-tertiary">No files yet.</p>
              <p className="mt-1 text-xs text-text-tertiary">Drag files anywhere on this page to upload, or click Upload above.</p>
            </div>
          )}

          {/* Project linked but provider disconnected */}
          {hasProject && !providerConnected && (
            <div className="py-12 text-center">
              <p className="text-sm text-text-tertiary">This episode has a {providerDisplayName} project linked, but {providerDisplayName} is disconnected.</p>
              <p className="mt-1 text-xs text-text-tertiary">Reconnect in Settings to view files and upload.</p>
            </div>
          )}

          {/* No provider connected at all */}
          {!hasProvider && !hasProject && (
            <div className="py-12 text-center">
              <p className="text-sm text-text-tertiary">No delivery provider connected.</p>
              <p className="mt-1 text-xs text-text-tertiary">Connect one in Settings to upload and manage files, or add deliverables manually below.</p>
              {!showManualForm && (
                <button
                  onClick={() => setShowManualForm(true)}
                  className="mt-4 rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-hover transition-colors"
                >
                  Add Deliverable
                </button>
              )}
            </div>
          )}
        </div>

        {/* Sidebar: metadata + deliverables */}
        <aside className="space-y-5 lg:sticky lg:top-4 lg:self-start">
          {/* Episode metadata */}
          <div className="space-y-3">
            {episode.stage && (
              <div>
                <h4 className="text-xs font-medium text-text-tertiary">Stage</h4>
                <p className="mt-0.5 text-sm text-text-primary">{episode.stage.name}</p>
              </div>
            )}
            {episode.scheduled_publish_date && (
              <div>
                <h4 className="text-xs font-medium text-text-tertiary">Publish Date</h4>
                <p className="mt-0.5 text-sm text-text-primary">{episode.scheduled_publish_date}</p>
              </div>
            )}
            {episode.published_at && (
              <div>
                <h4 className="text-xs font-medium text-text-tertiary">Published</h4>
                <p className="mt-0.5 text-sm text-text-primary">
                  {new Date(episode.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            )}
            {episode.description && (
              <div>
                <h4 className="text-xs font-medium text-text-tertiary">Description</h4>
                <p className="mt-1 text-xs text-text-secondary leading-relaxed whitespace-pre-wrap line-clamp-4">{episode.description}</p>
              </div>
            )}
            {episode.notes && (
              <div>
                <h4 className="text-xs font-medium text-text-tertiary">Notes</h4>
                <p className="mt-1 text-xs text-text-secondary leading-relaxed whitespace-pre-wrap line-clamp-4">{episode.notes}</p>
              </div>
            )}
          </div>

          {/* Deliverables */}
          {(() => {
            const fileIds = files.map((f) => f.id)
            const manualDeliverables = deliverables.filter((d) => {
              if (!d.file_url) return true
              return !fileIds.some((fid) => d.file_url!.includes(fid))
            })
            const totalLinked = deliverables.length - manualDeliverables.length
            const showSection = manualDeliverables.length > 0 || !hasProvider || showManualForm

            return showSection ? (
              <>
                <div className="border-t border-border-subtle" />
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-medium text-text-tertiary">
                      {manualDeliverables.length > 0 ? `Deliverables (${manualDeliverables.length})` : 'Deliverables'}
                    </h4>
                    {!showManualForm && (
                      <button onClick={() => setShowManualForm(true)} className="text-xs text-text-tertiary hover:text-text-primary transition-colors">
                        + Add
                      </button>
                    )}
                  </div>

                  {showManualForm && (
                    <form onSubmit={handleManualSubmit} className="space-y-2">
                      {manualError && <div className="rounded bg-error/10 border border-error/30 px-2 py-1 text-xs text-error">{manualError}</div>}
                      <input
                        type="text"
                        value={manualTitle}
                        onChange={(e) => setManualTitle(e.target.value)}
                        required
                        placeholder="Title"
                        className="block w-full rounded border border-border-default bg-surface-input px-2 py-1 text-xs text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
                      />
                      <select
                        value={manualType}
                        onChange={(e) => setManualType(e.target.value)}
                        className="block w-full rounded border border-border-default bg-surface-input px-2 py-1 text-xs text-text-primary focus:border-accent focus:outline-none"
                      >
                        {deliverableTypes.map((t) => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                      <input
                        type="url"
                        value={manualFileUrl}
                        onChange={(e) => setManualFileUrl(e.target.value)}
                        placeholder="File URL (optional)"
                        className="block w-full rounded border border-border-default bg-surface-input px-2 py-1 text-xs text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="submit"
                          disabled={manualLoading || !manualTitle.trim()}
                          className="rounded bg-accent px-2 py-1 text-xs font-medium text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
                        >
                          {manualLoading ? '...' : 'Submit'}
                        </button>
                        <button type="button" onClick={resetManualForm} className="text-xs text-text-tertiary hover:text-text-secondary transition-colors">
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}

                  <DeliverableList deliverables={manualDeliverables} />

                  {manualDeliverables.length === 0 && !showManualForm && (
                    <p className="text-xs text-text-tertiary">No manual deliverables.</p>
                  )}
                </div>
              </>
            ) : totalLinked > 0 ? (
              <>
                <div className="border-t border-border-subtle" />
                <div className="flex items-center justify-between">
                  <p className="text-xs text-text-tertiary">{totalLinked} deliverable{totalLinked !== 1 ? 's' : ''} linked above</p>
                  <button onClick={() => setShowManualForm(true)} className="text-xs text-text-tertiary hover:text-text-primary transition-colors">
                    + Add
                  </button>
                </div>
              </>
            ) : null
          })()}
        </aside>
      </div>
    </>
  )
}

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { DeliverableList } from '@/components/deliverables/deliverable-list'
import { FileUploader } from './file-uploader'
import { EpisodeAssets } from './episode-assets'
import { getGradient } from '@/lib/ui/gradient'
import { ProviderLogo } from '@/components/integrations/provider-logo'
import { ProjectPickerModal } from '@/components/integrations/project-picker-modal'
import type { IntegrationProvider } from '@/lib/integrations/types'
import { formatFileSize, formatDuration } from '@/lib/format'
import { DELIVERABLE_TYPES, TYPE_LABELS, STATUS_STYLES } from '@/lib/constants/deliverables'
import type { Deliverable, FileVersion } from '@/lib/constants/deliverables'
import { VersionPickerModal } from '@/components/portal/version-picker-modal'

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
  provider?: string
  version_number?: number
  version_count?: number
  version_group_id?: string
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
  acceptedMimeTypes?: string[]
}

interface DeliveryPanelProps {
  episodeId: string
  showId: string
  integration: DeliveryIntegration | null
  deliverables: Deliverable[]
  connectedProviders: IntegrationProvider[]
  episode: EpisodeMeta
  hideSidebar?: boolean
}


export function DeliveryPanel({
  episodeId, showId, integration: initialIntegration,
  deliverables, connectedProviders, episode, hideSidebar,
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

  const [dragSourceId, setDragSourceId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [versioningFileId, setVersioningFileId] = useState<string | null>(null)

  const [versionHistoryFileId, setVersionHistoryFileId] = useState<string | null>(null)
  const [versionHistoryFetchUrl, setVersionHistoryFetchUrl] = useState<string | null>(null)
  const [unstacking, setUnstacking] = useState(false)

  const [showManualForm, setShowManualForm] = useState(false)
  const [manualTitle, setManualTitle] = useState('')
  const [manualType, setManualType] = useState('rough_cut')
  const [manualFileUrl, setManualFileUrl] = useState('')
  const [manualProducerNotes, setManualProducerNotes] = useState('')
  const [manualLoading, setManualLoading] = useState(false)
  const [manualError, setManualError] = useState<string | null>(null)
  const [showConnectModal, setShowConnectModal] = useState(false)
  const [showProviderPicker, setShowProviderPicker] = useState(false)
  const [projectMissing, setProjectMissing] = useState(false)
  const [recreating, setRecreating] = useState(false)
  const [linkProvider, setLinkProvider] = useState<IntegrationProvider | null>(null)
  const [linking, setLinking] = useState(false)
  const [pickerIntent, setPickerIntent] = useState<'create' | 'link'>('create')
  const [deleting, setDeleting] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<BrowseItem | null>(null)

  const providerDisplayNames: Record<string, string> = {
    frame_io: 'Frame.io',
    google_drive: 'Google Drive',
    vimeo: 'Vimeo',
    dropbox: 'Dropbox',
  }

  const hasProject = !!integration?.externalProjectId
  const hasProvider = connectedProviders.length > 0
  const providerConnected = !!integration && connectedProviders.includes(integration.provider)
  const isExternalLive = hasProject && providerConnected
  const isLive = isExternalLive || (!hasProject && !integration)
  const providerDisplayName = integration?.displayName || 'Provider'

  const fetchFiles = useCallback(async () => {
    if (!isLive || (isExternalLive && projectMissing)) return
    setFilesLoading(true)
    setFilesError(null)
    try {
      const res = await fetch(`/api/v1/episodes/${episodeId}/delivery/files`)
      if (!res.ok) {
        if (res.status === 410) {
          setProjectMissing(true)
          return
        }
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
  }, [episodeId, isLive, projectMissing])

  const thumbnailTimersRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const pipelineRetryRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleUploadComplete = useCallback(() => {
    fetchFiles()
    thumbnailTimersRef.current.forEach(clearTimeout)
    thumbnailTimersRef.current = []

    const retryDelays = [5000, 15000, 30000, 60000]
    let attempt = 0

    const tryTriggerPipeline = async () => {
      try {
        const res = await fetch(`/api/v1/episodes/${episodeId}/pipeline`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        })
        if (res.ok) return
        if ((res.status === 409 || res.status === 400) && attempt < retryDelays.length) {
          pipelineRetryRef.current = setTimeout(tryTriggerPipeline, retryDelays[attempt++])
        }
      } catch {
        if (attempt < retryDelays.length) {
          pipelineRetryRef.current = setTimeout(tryTriggerPipeline, retryDelays[attempt++])
        }
      }
    }

    pipelineRetryRef.current = setTimeout(tryTriggerPipeline, retryDelays[attempt++])

    const pollDelays = [5000, 15000, 30000, 60000]
    for (const delay of pollDelays) {
      const timer = setTimeout(async () => {
        if (!isLive || projectMissing) return
        try {
          const res = await fetch(`/api/v1/episodes/${episodeId}/delivery/files`)
          if (!res.ok) return
          const json = await res.json()
          const items = (json.data?.items || []) as BrowseItem[]
          setFiles(items)
          const thumb = items.find((f) => f.thumbnailUrl)?.thumbnailUrl
          if (thumb) {
            await fetch(`/api/v1/episodes/${episodeId}/auto-thumbnail`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ thumbnail_url: thumb }),
            })
            thumbnailTimersRef.current.forEach(clearTimeout)
            thumbnailTimersRef.current = []
          }
        } catch { /* ignore */ }
      }, delay)
      thumbnailTimersRef.current.push(timer)
    }
  }, [fetchFiles, episodeId, isLive, projectMissing])

  useEffect(() => {
    if (isLive) fetchFiles()
    return () => {
      thumbnailTimersRef.current.forEach(clearTimeout)
      if (pipelineRetryRef.current) clearTimeout(pipelineRetryRef.current)
    }
  }, [isLive, fetchFiles])

  function handleCreateProject() {
    if (connectedProviders.length > 1) {
      setPickerIntent('create')
      setShowProviderPicker(true)
    } else {
      createProjectWithProvider(connectedProviders[0])
    }
  }

  async function createProjectWithProvider(provider: IntegrationProvider) {
    setShowProviderPicker(false)
    setCreatingProject(true)
    setCreateError(null)
    try {
      const res = await fetch(`/api/v1/episodes/${episodeId}/delivery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      })
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

  async function handleRecreateProject() {
    setRecreating(true)
    setCreateError(null)
    try {
      const res = await fetch(`/api/v1/episodes/${episodeId}/delivery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recreate: true }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to recreate project')
      const data = json.data?.integration || json.data
      setIntegration({
        provider: data.provider,
        externalProjectId: data.external_project_id,
        externalFolderId: data.external_folder_id,
        externalViewUrl: data.external_view_url,
        displayName: data.display_name || data.provider,
      })
      setProjectMissing(false)
      setFilesError(null)
      setFiles([])
      router.refresh()
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to recreate project')
    } finally {
      setRecreating(false)
    }
  }

  function handleLinkExisting() {
    if (connectedProviders.length === 1) {
      setLinkProvider(connectedProviders[0])
    } else {
      setPickerIntent('link')
      setShowProviderPicker(true)
    }
  }

  async function handleLinkProject(item: { id: string; name: string; type: string; viewUrl?: string }) {
    if (!linkProvider) return
    setLinking(true)
    setCreateError(null)
    try {
      const res = await fetch(`/api/v1/episodes/${episodeId}/delivery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          link: true,
          provider: linkProvider,
          external_project_id: item.id,
          external_folder_id: item.id,
          external_view_url: item.viewUrl || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to link project')
      const data = json.data?.integration || json.data
      setIntegration({
        provider: data.provider,
        externalProjectId: data.external_project_id,
        externalFolderId: data.external_folder_id,
        externalViewUrl: data.external_view_url,
        displayName: data.display_name || data.provider,
      })
      setLinkProvider(null)
      router.refresh()
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to link project')
    } finally {
      setLinking(false)
    }
  }

  function isFileLinkedAsDeliverable(file: BrowseItem): Deliverable | null {
    if (file.version_group_id) {
      const match = deliverables.find((d) => d.version_group_id === file.version_group_id)
      if (match) return match
    }
    const byRef = deliverables.find((d) => d.file_reference_id === file.id)
    if (byRef) return byRef
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
          mime_type: file.mimeType || null,
          external_file_id: file.id,
          provider: file.provider || integration?.provider,
        }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({ error: 'Failed to submit' }))
        throw new Error(json.error || 'Failed to share file')
      }
      await fetchFiles()
      router.refresh()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to submit')
    } finally {
      setSubmitting(null)
    }
  }

  async function handleDeleteFile(file: BrowseItem) {
    setDeleting(file.id)
    try {
      const res = await fetch(`/api/v1/episodes/${episodeId}/delivery/files/${file.id}`, {
        method: 'DELETE',
      })
      if (!res.ok && res.status !== 204) {
        const json = await res.json().catch(() => ({ error: 'Failed to delete' }))
        throw new Error(json.error || 'Failed to delete file')
      }
      setFiles(prev => prev.filter(f => f.id !== file.id))
      setConfirmDelete(null)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to delete file')
    } finally {
      setDeleting(null)
    }
  }

  function resetManualForm() {
    setManualTitle('')
    setManualType('rough_cut')
    setManualFileUrl('')
    setManualProducerNotes('')
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
          title: manualTitle, file_url: manualFileUrl || null, producer_notes: manualProducerNotes || null,
        }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({ error: 'Failed to create' }))
        throw new Error(json.error || 'Failed to share file')
      }
      resetManualForm()
      router.refresh()
    } catch (err) {
      setManualError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setManualLoading(false)
    }
  }

  function getReviewUrl(file: BrowseItem, linked: Deliverable | null): string | null {
    const mime = file.mimeType || ''
    if (!mime.startsWith('video/') && !mime.startsWith('audio/')) return null

    if (linked) {
      return `/app/shows/${showId}/episodes/${episodeId}/review/${linked.id}`
    }
    return `/app/shows/${showId}/episodes/${episodeId}/preview/${file.id}`
  }

  async function openVersionHistory(fileExternalId: string) {
    try {
      const { data: ref } = await fetch(`/api/v1/integrations/file-references?episode_id=${episodeId}&external_id=${fileExternalId}`)
        .then((r) => r.json())
      const fileRefId = Array.isArray(ref) ? ref[0]?.id : ref?.id
      if (!fileRefId) return
      setVersionHistoryFileId(fileExternalId)
      setVersionHistoryFetchUrl(`/api/v1/episodes/${episodeId}/delivery/files/${fileRefId}/versions`)
    } catch { /* ignore */ }
  }

  async function handleUnstack(version: FileVersion) {
    setUnstacking(true)
    try {
      await fetch(`/api/v1/integrations/file-references/${version.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unstack: true }),
      })
      setVersionHistoryFileId(null)
      setVersionHistoryFetchUrl(null)
      fetchFiles()
    } catch { /* ignore */ }
    setUnstacking(false)
  }

  function getMimePrefix(mimeType?: string): string {
    if (!mimeType) return ''
    return mimeType.split('/')[0]
  }

  function canStack(source: BrowseItem, target: BrowseItem): boolean {
    if (source.id === target.id) return false
    if (!source.mimeType || !target.mimeType) return true
    return getMimePrefix(source.mimeType) === getMimePrefix(target.mimeType)
  }

  async function handleVersionDrop(sourceId: string, targetId: string) {
    const source = files.find((f) => f.id === sourceId)
    const target = files.find((f) => f.id === targetId)
    if (!source || !target) return

    setVersioningFileId(sourceId)
    try {
      const res = await fetch(`/api/v1/episodes/${episodeId}/delivery/files/version`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_external_id: sourceId,
          target_external_id: targetId,
          source_name: source.name,
          target_name: target.name,
          source_mime_type: source.mimeType,
          target_mime_type: target.mimeType,
          source_view_url: source.viewUrl,
          target_view_url: target.viewUrl,
        }),
      })
      if (res.ok) {
        const json = await res.json()
        const reshared = json.data?.auto_reshared || []
        if (reshared.length > 0) {
          toast.success(`v${json.data.version_number} of ${target.name} was automatically shared with the client`)
        }
        fetchFiles()
      }
    } catch { /* ignore */ }
    setVersioningFileId(null)
  }

  const dragSourceFile = dragSourceId ? files.find((f) => f.id === dragSourceId) : null

  function getDragProps(file: BrowseItem) {
    const isDragOver = dragOverId === file.id && dragSourceId !== file.id
    const stackable = isDragOver && dragSourceFile ? canStack(dragSourceFile, file) : false
    return {
      draggable: true,
      onDragStart: (e: React.DragEvent) => { e.dataTransfer.setData('text/plain', file.id); setDragSourceId(file.id) },
      onDragEnd: () => { setDragSourceId(null); setDragOverId(null) },
      onDragOver: (e: React.DragEvent) => { e.preventDefault(); setDragOverId(file.id) },
      onDragLeave: () => setDragOverId(null),
      onDrop: (e: React.DragEvent) => {
        e.preventDefault()
        setDragOverId(null)
        const srcId = e.dataTransfer.getData('text/plain')
        if (srcId && srcId !== file.id) handleVersionDrop(srcId, file.id)
      },
      isDragOver,
      stackable,
      isDragSource: dragSourceId === file.id,
    }
  }

  function renderFileCard(file: BrowseItem) {
    const linked = isFileLinkedAsDeliverable(file)
    const style = linked ? STATUS_STYLES[linked.status] || STATUS_STYLES.pending : null
    const reviewUrl = getReviewUrl(file, linked)

    const drag = getDragProps(file)

    return (
      <div
        key={file.id}
        draggable={drag.draggable}
        onDragStart={drag.onDragStart}
        onDragEnd={drag.onDragEnd}
        onDragOver={drag.onDragOver}
        onDragLeave={drag.onDragLeave}
        onDrop={drag.onDrop}
        className={`rounded-lg border bg-surface-overlay overflow-hidden transition-all ${
          drag.isDragOver && drag.stackable ? 'border-accent ring-2 ring-accent/30' :
          drag.isDragOver && !drag.stackable ? 'border-red-400 ring-2 ring-red-400/30' :
          drag.isDragSource ? 'opacity-50 border-border-subtle' :
          'border-border-subtle'
        }`}
      >
        {drag.isDragOver && drag.stackable && (
          <div className="bg-accent/10 px-2 py-1 text-center text-xs font-medium text-accent">
            Drop to create version stack
          </div>
        )}
        <a href={reviewUrl || file.viewUrl || '#'} target={reviewUrl ? undefined : '_blank'} rel={reviewUrl ? undefined : 'noopener noreferrer'} className="block relative aspect-video overflow-hidden">
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
          {file.version_count != null && file.version_count > 1 && (
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); openVersionHistory(file.id) }}
              className="absolute top-1.5 right-1.5 rounded bg-surface-raised/90 px-1.5 py-0.5 text-[10px] font-medium text-text-secondary backdrop-blur-sm hover:bg-surface-raised hover:text-text-primary transition-colors"
            >
              v{file.version_number}
            </button>
          )}
        </a>
        <div className="p-2.5 space-y-2">
          <div className="flex items-start justify-between gap-1">
            <div className="min-w-0">
              <p className="text-sm font-medium text-text-primary truncate" title={file.name}>{file.name}</p>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-text-secondary">
                {file.fileSize != null && file.fileSize > 0 && <span>{formatFileSize(file.fileSize)}</span>}
                <span>&middot; {getFileExt(file.name)}</span>
                {file.createdAt && (
                  <span>&middot; {new Date(file.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                )}
                {linked && <span className="text-text-secondary">&middot; {TYPE_LABELS[linked.type] || linked.type}</span>}
              </div>
            </div>
            <button
              onClick={(e) => { e.preventDefault(); setConfirmDelete(file) }}
              className="shrink-0 rounded p-1 text-text-tertiary hover:text-red-400 hover:bg-red-400/10 transition-colors"
              title="Delete file"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
          {!linked && (
            <div className="flex items-center gap-1.5">
              <select
                value={selectedTypes[file.id] || 'rough_cut'}
                onChange={(e) => setSelectedTypes((prev) => ({ ...prev, [file.id]: e.target.value }))}
                className="min-w-0 flex-1 rounded border border-border-default bg-surface-input px-1.5 py-1 text-xs text-text-primary focus:border-accent focus:outline-none"
              >
                {DELIVERABLE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <button
                onClick={() => handleSubmitForReview(file)}
                disabled={submitting === file.id}
                className="shrink-0 rounded bg-accent px-2 py-1 text-xs font-medium text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
              >
                {submitting === file.id ? '...' : 'Share'}
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
      <div className="overflow-x-auto">
        <table className="w-full text-left min-w-[600px]">
        <thead>
          <tr className="text-xs font-medium border-b border-border-subtle">
            <SortHeader label="Name" column="name" width="" />
            <SortHeader label="Size" column="size" width="w-20" />
            <SortHeader label="Type" column="type" width="w-16" />
            <SortHeader label="Uploaded" column="date" width="w-20" />
            <th className="pb-2 font-medium w-48 text-right text-text-secondary">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-subtle">
          {sorted.map((file) => {
            const linked = isFileLinkedAsDeliverable(file)
            const style = linked ? STATUS_STYLES[linked.status] || STATUS_STYLES.pending : null

            const drag = getDragProps(file)

            return (
              <tr
                key={file.id}
                draggable={drag.draggable}
                onDragStart={drag.onDragStart}
                onDragEnd={drag.onDragEnd}
                onDragOver={drag.onDragOver}
                onDragLeave={drag.onDragLeave}
                onDrop={drag.onDrop}
                className={`group ${
                  drag.isDragOver && drag.stackable ? 'bg-accent/10 outline outline-2 outline-accent/30' :
                  drag.isDragOver && !drag.stackable ? 'bg-red-400/10 outline outline-2 outline-red-400/30' :
                  drag.isDragSource ? 'opacity-50' : ''
                }`}
              >
                <td className="py-2 pr-3">
                  <div className="flex items-center gap-3">
                    <a href={getReviewUrl(file, linked) || file.viewUrl || '#'} target={getReviewUrl(file, linked) ? undefined : '_blank'} rel={getReviewUrl(file, linked) ? undefined : 'noopener noreferrer'} className="shrink-0 block w-14 aspect-video rounded overflow-hidden">
                      {file.thumbnailUrl ? (
                        <img src={file.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full" style={{ background: getGradient(file.id) }} />
                      )}
                    </a>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-sm font-medium text-text-primary">{file.name}</p>
                        {file.version_count != null && file.version_count > 1 && (
                          <button
                            onClick={() => openVersionHistory(file.id)}
                            className="shrink-0 rounded bg-surface-raised px-1.5 py-0.5 text-[10px] font-medium text-text-secondary hover:bg-accent/10 hover:text-accent transition-colors"
                          >
                            v{file.version_number}
                          </button>
                        )}
                      </div>
                      {linked && <p className="text-xs text-text-secondary">{TYPE_LABELS[linked.type] || linked.type}</p>}
                    </div>
                  </div>
                </td>
                <td className="py-2 pr-3 text-xs text-text-secondary tabular-nums">
                  {file.fileSize != null && file.fileSize > 0 ? formatFileSize(file.fileSize) : '—'}
                </td>
                <td className="py-2 pr-3 text-xs text-text-secondary">
                  {getFileExt(file.name)}
                </td>
                <td className="py-2 pr-3 text-xs text-text-secondary">
                  {file.createdAt ? new Date(file.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                </td>
                <td className="py-2 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    {linked && style ? (
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}>{style.label}</span>
                    ) : (
                      <>
                        <select
                          value={selectedTypes[file.id] || 'rough_cut'}
                          onChange={(e) => setSelectedTypes((prev) => ({ ...prev, [file.id]: e.target.value }))}
                          className="rounded border border-border-default bg-surface-input px-1.5 py-1 text-xs text-text-primary focus:border-accent focus:outline-none"
                        >
                          {DELIVERABLE_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleSubmitForReview(file)}
                          disabled={submitting === file.id}
                          className="rounded bg-accent px-2 py-1 text-xs font-medium text-white hover:bg-accent-hover transition-colors disabled:opacity-50 whitespace-nowrap"
                        >
                          {submitting === file.id ? '...' : 'Share'}
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => setConfirmDelete(file)}
                      className="rounded p-1 text-text-tertiary opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-red-400/10 transition-all"
                      title="Delete file"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
        </table>
      </div>
    )
  }

  return (
    <>
      <FileUploader
        episodeId={episodeId}
        enabled={isLive && !projectMissing}
        listenForDrags
        acceptedMimeTypes={integration?.acceptedMimeTypes}
        onUploadComplete={handleUploadComplete}
        onUnavailableDrop={() => setShowConnectModal(true)}
        onProjectMissing={() => setProjectMissing(true)}
        triggerRef={fileInputRef}
      />

      {showConnectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={(e) => { if (e.target === e.currentTarget) setShowConnectModal(false) }}>
          <div className="w-full max-w-sm rounded-xl border border-border-subtle bg-surface-raised p-6 shadow-xl">
            <h3 className="text-base font-semibold text-text-primary">Connect a delivery provider</h3>
            <p className="mt-2 text-sm text-text-secondary">
              Pick a provider to start uploading and managing files for this episode.
            </p>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {([
                { provider: 'frame_io' as IntegrationProvider, name: 'Frame.io', desc: 'Video review & approval' },
                { provider: 'google_drive' as IntegrationProvider, name: 'Google Drive', desc: 'File storage & sharing' },
                { provider: 'vimeo' as IntegrationProvider, name: 'Vimeo', desc: 'Video hosting & delivery' },
                { provider: 'youtube' as IntegrationProvider, name: 'YouTube', desc: 'Video hosting & publishing' },
              ]).map((p) => (
                <Link
                  key={p.provider}
                  href={`/app/settings/integrations?connect=${p.provider}&returnTo=/app/shows/${showId}/episodes/${episodeId}`}
                  className="group flex flex-col items-center gap-2.5 rounded-lg border border-border-default bg-surface-base p-4 text-center transition-all hover:border-accent hover:bg-accent/5 hover:shadow-sm"
                >
                  <ProviderLogo provider={p.provider} className="w-10 h-10" />
                  <div>
                    <p className="text-sm font-medium text-text-primary group-hover:text-accent transition-colors">
                      {p.name}
                    </p>
                    <p className="mt-0.5 text-xs text-text-secondary">{p.desc}</p>
                  </div>
                </Link>
              ))}
            </div>
            <button
              onClick={() => setShowConnectModal(false)}
              className="mt-4 w-full text-center text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {showProviderPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-xl border border-border-subtle bg-surface-raised p-6 shadow-xl">
            <h3 className="text-base font-semibold text-text-primary">Choose a delivery provider</h3>
            <p className="mt-2 text-sm text-text-secondary">
              Where should files for this episode be stored?
            </p>
            <div className="mt-4 space-y-2">
              {connectedProviders.map((p) => (
                <button
                  key={p}
                  onClick={() => {
                    if (pickerIntent === 'link') {
                      setShowProviderPicker(false)
                      setLinkProvider(p)
                    } else {
                      createProjectWithProvider(p)
                    }
                  }}
                  disabled={creatingProject}
                  className="w-full rounded-lg border border-border-subtle bg-surface-overlay px-4 py-3 text-left text-sm font-medium text-text-primary transition-colors hover:border-accent hover:bg-accent/5 disabled:opacity-50"
                >
                  {providerDisplayNames[p] || p}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowProviderPicker(false)}
              className="mt-3 w-full rounded-md px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {linkProvider && (
        <ProjectPickerModal
          provider={linkProvider}
          providerDisplayName={providerDisplayNames[linkProvider] || linkProvider}
          open
          onClose={() => setLinkProvider(null)}
          onSelect={handleLinkProject}
        />
      )}

      <div className={hideSidebar ? '' : 'grid grid-cols-1 gap-6 lg:grid-cols-[1fr_260px]'}>
        {/* Main: files */}
        <div className="min-w-0 space-y-4">
          {/* Header bar */}
          {(hasProvider || isLive) && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              {hasProvider && !hasProject ? (
                <div className="rounded-xl border border-border-subtle bg-surface-raised p-5">
                  <div className="flex items-center gap-3">
                    <ProviderLogo provider={connectedProviders[0]} className="w-8 h-8" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary">
                        Set up delivery
                      </p>
                      <p className="mt-0.5 text-xs text-text-secondary">
                        Create a new {connectedProviders[0] === 'google_drive' ? 'folder' : 'project'} for this episode, or link one you already have.
                      </p>
                    </div>
                  </div>
                  {createError && (
                    <div className="mt-3 rounded-md bg-error/10 border border-error/30 px-3 py-2 text-xs text-error">{createError}</div>
                  )}
                  <div className="mt-4 flex items-center gap-2">
                    <button
                      onClick={handleCreateProject}
                      disabled={creatingProject || linking}
                      className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
                    >
                      {creatingProject ? 'Creating...' : `Create ${connectedProviders[0] === 'google_drive' ? 'Folder' : 'Project'}`}
                    </button>
                    <button
                      onClick={handleLinkExisting}
                      disabled={creatingProject || linking}
                      className="rounded-md border border-border-default bg-surface-overlay px-4 py-2 text-sm font-medium text-text-primary hover:bg-surface-input transition-colors disabled:opacity-50"
                    >
                      {linking ? 'Linking...' : 'Link Existing'}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 rounded-md border border-border-default bg-surface-overlay px-3 py-1.5 text-sm font-medium text-text-primary hover:bg-surface-input transition-colors"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                      Upload
                    </button>
                    <button
                      onClick={fetchFiles}
                      disabled={filesLoading}
                      className="inline-flex items-center rounded-md border border-border-default bg-surface-overlay px-2.5 py-1.5 text-sm text-text-secondary hover:bg-surface-input hover:text-text-primary transition-colors disabled:opacity-50"
                      title="Refresh files"
                    >
                      <svg className={`h-4 w-4 ${filesLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                    <div className="ml-1 flex items-center rounded-md border border-border-default overflow-hidden">
                      <button
                        onClick={() => setViewMode('grid')}
                        className={`px-2.5 py-1.5 transition-colors ${viewMode === 'grid' ? 'bg-surface-overlay text-text-primary' : 'text-text-tertiary hover:text-text-secondary hover:bg-surface-input'}`}
                        title="Grid view"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
                          <path d="M1 2.75A1.75 1.75 0 0 1 2.75 1h2.5A1.75 1.75 0 0 1 7 2.75v2.5A1.75 1.75 0 0 1 5.25 7h-2.5A1.75 1.75 0 0 1 1 5.25v-2.5ZM9 2.75A1.75 1.75 0 0 1 10.75 1h2.5A1.75 1.75 0 0 1 15 2.75v2.5A1.75 1.75 0 0 1 13.25 7h-2.5A1.75 1.75 0 0 1 9 5.25v-2.5ZM1 10.75A1.75 1.75 0 0 1 2.75 9h2.5A1.75 1.75 0 0 1 7 10.75v2.5A1.75 1.75 0 0 1 5.25 15h-2.5A1.75 1.75 0 0 1 1 13.25v-2.5ZM9 10.75A1.75 1.75 0 0 1 10.75 9h2.5A1.75 1.75 0 0 1 15 10.75v2.5A1.75 1.75 0 0 1 13.25 15h-2.5A1.75 1.75 0 0 1 9 13.25v-2.5Z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setViewMode('list')}
                        className={`px-2.5 py-1.5 transition-colors ${viewMode === 'list' ? 'bg-surface-overlay text-text-primary' : 'text-text-tertiary hover:text-text-secondary hover:bg-surface-input'}`}
                        title="List view"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
                          <path fillRule="evenodd" d="M2 4a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4Zm0 4a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 8Zm0 4a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 12Z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                    {integration?.externalViewUrl && (
                      <a
                        href={integration.externalViewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-1 inline-flex items-center gap-1 rounded-md border border-border-default bg-surface-overlay px-2.5 py-1.5 text-sm text-text-secondary hover:bg-surface-input hover:text-text-primary transition-colors"
                        title={`Open in ${providerDisplayName}`}
                      >
                        {providerDisplayName}
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    )}
                  </div>
                </>
              )}
              {createError && <p className="text-xs text-error">{createError}</p>}
            </div>
          )}

          {filesError && !projectMissing && <div className="rounded-md bg-error/10 border border-error/30 px-3 py-2 text-xs text-error">{filesError}</div>}
          {submitError && <div className="rounded-md bg-error/10 border border-error/30 px-3 py-2 text-xs text-error">{submitError}</div>}

          {/* Project folder missing (deleted/trashed on provider) */}
          {projectMissing && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
              <p className="text-sm font-medium text-text-primary">Project folder not found</p>
              <p className="mt-1 text-xs text-text-secondary">
                The {providerDisplayName} folder for this episode was deleted or moved to trash.
                You can recreate it — any previously uploaded files will not be recovered.
              </p>
              {createError && <p className="mt-2 text-xs text-error">{createError}</p>}
              <button
                onClick={handleRecreateProject}
                disabled={recreating}
                className="mt-3 rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
              >
                {recreating ? 'Recreating...' : 'Recreate Project'}
              </button>
            </div>
          )}

          {/* File grid or list */}
          {isLive && !projectMissing && !filesLoading && files.length > 0 && (
            viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 xl:grid-cols-3">
                {files.map(renderFileCard)}
              </div>
            ) : (
              renderFileTable()
            )
          )}

          {/* Loading skeleton */}
          {isLive && filesLoading && files.length === 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 xl:grid-cols-3">
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
          {isLive && !projectMissing && !filesLoading && files.length === 0 && !filesError && (
            <div className="py-12 text-center">
              <p className="text-sm text-text-primary">No files yet.</p>
              <p className="mt-1 text-xs text-text-secondary">Drag files anywhere on this page to upload, or click Upload above.</p>
            </div>
          )}

          {/* Project linked but provider disconnected */}
          {hasProject && !providerConnected && (
            <div className="py-12 text-center">
              <p className="text-sm text-text-primary">This episode has a {providerDisplayName} project linked, but {providerDisplayName} is disconnected.</p>
              <p className="mt-1 text-xs text-text-secondary">Reconnect in Settings to view files and upload.</p>
            </div>
          )}
        </div>

        {/* Sidebar: metadata + deliverables */}
        {!hideSidebar && <aside className="space-y-5 lg:sticky lg:top-4 lg:self-start">
          {/* Episode metadata */}
          <div className="space-y-3">
            {episode.stage && (
              <div>
                <h4 className="text-xs font-medium text-text-secondary">Stage</h4>
                <p className="mt-0.5 text-sm text-text-primary">{episode.stage.name}</p>
              </div>
            )}
            {episode.scheduled_publish_date && (
              <div>
                <h4 className="text-xs font-medium text-text-secondary">Publish Date</h4>
                <p className="mt-0.5 text-sm text-text-primary">{episode.scheduled_publish_date}</p>
              </div>
            )}
            {episode.published_at && (
              <div>
                <h4 className="text-xs font-medium text-text-secondary">Published</h4>
                <p className="mt-0.5 text-sm text-text-primary">
                  {new Date(episode.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            )}
            {episode.description && (
              <div>
                <h4 className="text-xs font-medium text-text-secondary">Description</h4>
                <p className="mt-1 text-xs text-text-secondary leading-relaxed whitespace-pre-wrap line-clamp-4">{episode.description}</p>
              </div>
            )}
            {episode.notes && (
              <div>
                <h4 className="text-xs font-medium text-text-secondary">Notes</h4>
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
                    <h4 className="text-xs font-medium text-text-secondary">
                      {manualDeliverables.length > 0 ? `Shared Files (${manualDeliverables.length})` : 'Shared Files'}
                    </h4>
                    {!showManualForm && (
                      <button onClick={() => setShowManualForm(true)} className="text-xs text-text-secondary hover:text-text-primary transition-colors">
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
                        {DELIVERABLE_TYPES.map((t) => (
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
                      <textarea
                        value={manualProducerNotes}
                        onChange={(e) => setManualProducerNotes(e.target.value)}
                        placeholder="Notes for client (optional)"
                        rows={2}
                        className="block w-full rounded border border-border-default bg-surface-input px-2 py-1 text-xs text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none resize-none"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="submit"
                          disabled={manualLoading || !manualTitle.trim()}
                          className="rounded bg-accent px-2 py-1 text-xs font-medium text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
                        >
                          {manualLoading ? '...' : 'Share'}
                        </button>
                        <button type="button" onClick={resetManualForm} className="text-xs text-text-secondary hover:text-text-primary transition-colors">
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}

                  <DeliverableList deliverables={manualDeliverables} />

                  {manualDeliverables.length === 0 && !showManualForm && (
                    <p className="text-xs text-text-secondary">No shared files.</p>
                  )}
                </div>
              </>
            ) : totalLinked > 0 ? (
              <>
                <div className="border-t border-border-subtle" />
                <div className="flex items-center justify-between">
                  <p className="text-xs text-text-secondary">{totalLinked} shared file{totalLinked !== 1 ? 's' : ''} linked above</p>
                  <button onClick={() => setShowManualForm(true)} className="text-xs text-text-secondary hover:text-text-primary transition-colors">
                    + Add
                  </button>
                </div>
              </>
            ) : null
          })()}

          <div className="border-t border-border-subtle" />
          <EpisodeAssets episodeId={episodeId} />
        </aside>}
      </div>

      {/* Version history modal */}
      {versionHistoryFileId && versionHistoryFetchUrl && (
        <VersionPickerModal
          fetchUrl={versionHistoryFetchUrl}
          onUnstack={handleUnstack}
          unstacking={unstacking}
          onClose={() => { setVersionHistoryFileId(null); setVersionHistoryFetchUrl(null) }}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={(e) => { if (e.target === e.currentTarget) setConfirmDelete(null) }}>
          <div className="w-full max-w-sm rounded-xl border border-border-subtle bg-surface-raised p-6 shadow-xl">
            <h3 className="text-base font-semibold text-text-primary">Delete file</h3>
            <p className="mt-2 text-sm text-text-secondary">
              This will permanently delete <span className="font-medium text-text-primary">{confirmDelete.name}</span> from {integration?.displayName || 'the provider'}. This cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                disabled={deleting !== null}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteFile(confirmDelete)}
                disabled={deleting !== null}
                className="rounded-md bg-red-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

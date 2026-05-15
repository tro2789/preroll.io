'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { IntegrationProvider } from '@/lib/integrations/types'

interface PeekPaneProps {
  episodeId: string
  showId: string
  episode: {
    episode_number: number | null
    scheduled_publish_date: string | null
    recorded_at?: string | null
    published_at: string | null
    description: string | null
    notes: string | null
  }
  stage: { name: string } | null
  showName: string
  clientName: string | null
  deliverables: { id: string; title: string; status: string }[]
  integration: {
    provider: IntegrationProvider
    externalProjectId: string | null
    externalFolderId: string | null
    externalViewUrl: string | null
    displayName: string
    acceptedMimeTypes?: string[]
  } | null
  connectedProviders: IntegrationProvider[]
  hasIntegration: boolean
  audioFileCount: number
}

interface FileRef {
  id: string
  file_name: string | null
  mime_type: string | null
  file_size: number | null
}

const STATUS_COLORS: Record<string, { text: string; bg: string }> = {
  approved: { text: 'var(--color-success)', bg: 'oklch(0.74 0.14 165 / 0.18)' },
  pending: { text: 'var(--color-warning)', bg: 'oklch(0.78 0.13 75 / 0.18)' },
  revision_requested: { text: 'var(--color-error)', bg: 'oklch(0.66 0.18 22 / 0.18)' },
  draft: { text: 'var(--color-text-tertiary)', bg: 'var(--color-surface-overlay)' },
}

const STATUS_LABELS: Record<string, string> = {
  approved: 'Approved',
  pending: 'Pending',
  revision_requested: 'Revision',
  draft: 'Draft',
}

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatSize(bytes: number | null) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

function fileIcon(mimeType: string | null) {
  if (mimeType?.startsWith('audio/')) return 'audio'
  if (mimeType?.startsWith('video/')) return 'video'
  if (mimeType?.startsWith('image/')) return 'image'
  return 'file'
}

const FILE_ICON_COLORS: Record<string, string> = {
  audio: 'text-violet-400 bg-violet-400/15',
  video: 'text-sky-400 bg-sky-400/15',
  image: 'text-emerald-400 bg-emerald-400/15',
  file: 'text-text-secondary bg-surface-overlay',
}

export function PeekPane({
  episodeId,
  showId,
  episode,
  stage,
  showName,
  clientName,
  deliverables,
  integration,
  audioFileCount,
}: PeekPaneProps) {
  const [files, setFiles] = useState<FileRef[]>([])
  const [filesLoading, setFilesLoading] = useState(false)

  useEffect(() => {
    setFilesLoading(true)
    fetch(`/api/v1/integrations/file-references?episode_id=${episodeId}`)
      .then(r => r.json())
      .then(json => setFiles(json.data || []))
      .catch(() => {})
      .finally(() => setFilesLoading(false))
  }, [episodeId])

  return (
    <div className="flex flex-col gap-3.5">
      {/* Files */}
      <div className="bg-surface-raised border border-border-subtle rounded-[10px] overflow-hidden">
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border-subtle">
          <h3 className="text-[13.5px] font-semibold text-text-primary">Files</h3>
          <span className="ml-auto text-[11px] text-text-tertiary font-mono">{files.length || audioFileCount}</span>
        </div>
        {filesLoading ? (
          <div className="px-4 py-4 text-center text-xs text-text-secondary">Loading...</div>
        ) : files.length > 0 ? (
          <div className="py-1">
            {files.map(f => {
              const iconType = fileIcon(f.mime_type)
              const iconColor = FILE_ICON_COLORS[iconType]
              return (
                <div key={f.id} className="flex items-center gap-2.5 px-4 py-[7px] hover:bg-[oklch(0.21_0.006_264_/_0.4)] transition-colors">
                  <span className={`flex items-center justify-center w-[22px] h-[22px] rounded-[5px] shrink-0 ${iconColor}`}>
                    {iconType === 'audio' && (
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>
                    )}
                    {iconType === 'video' && (
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polygon points="5 3 19 12 5 21 5 3" /></svg>
                    )}
                    {iconType === 'image' && (
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                    )}
                    {iconType === 'file' && (
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><polyline points="13 2 13 9 20 9" /></svg>
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] text-text-primary truncate">{f.file_name || 'Untitled'}</p>
                    {f.file_size && <p className="text-[10.5px] text-text-tertiary">{formatSize(f.file_size)}</p>}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="px-4 py-4 text-center text-xs text-text-secondary">
            {integration ? 'No files yet' : 'Connect a provider to manage files'}
          </div>
        )}
      </div>

      {/* Metadata */}
      <div className="bg-surface-raised border border-border-subtle rounded-[10px] p-4">
        <MetaRow label="Show" value={
          <Link href={`/app/shows/${showId}`} className="text-text-primary hover:text-accent transition-colors">{showName}</Link>
        } />
        {clientName && <MetaRow label="Client" value={clientName} />}
        {episode.episode_number != null && (
          <MetaRow label="Episode" value={<span className="font-mono">{String(episode.episode_number).padStart(3, '0')}</span>} />
        )}
        <MetaRow label="Schedule" value={<span className="font-mono">{formatDate(episode.scheduled_publish_date)}</span>} />
        {episode.published_at && (
          <MetaRow label="Published" value={<span className="font-mono">{formatDate(episode.published_at)}</span>} />
        )}
      </div>

      {/* Linked deliverables */}
      {deliverables.length > 0 && (
        <div className="bg-surface-raised border border-border-subtle rounded-[10px] overflow-hidden">
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border-subtle">
            <h3 className="text-[13.5px] font-semibold text-text-primary">Linked deliverables</h3>
            <span className="ml-auto text-[11px] text-text-tertiary">{deliverables.length}</span>
          </div>
          <div className="py-1.5">
            {deliverables.map((d) => {
              const colors = STATUS_COLORS[d.status] || STATUS_COLORS.draft
              const label = STATUS_LABELS[d.status] || d.status
              return (
                <div key={d.id} className="flex items-center gap-3 px-4 py-2">
                  <span className="flex-1 text-[12.5px] text-text-primary truncate">{d.title}</span>
                  <span
                    className="text-[11px] font-semibold font-mono px-1.5 py-0.5 rounded"
                    style={{ color: colors.text, background: colors.bg }}
                  >
                    {label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

    </div>
  )
}

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3 py-[9px] border-b border-border-subtle last:border-b-0 text-[13px]">
      <span className="text-text-secondary">{label}</span>
      <span className="text-text-primary text-right">{value}</span>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { getGradient } from '@/lib/ui/gradient'
import { formatFileSize, formatDuration } from '@/lib/format'
import type { FileVersion } from '@/lib/constants/deliverables'

interface VersionPickerModalProps {
  fetchUrl: string
  currentFileReferenceId?: string | null
  reviewBaseUrl?: string
  onVersionClick?: (version: FileVersion) => void
  onUnstack?: (version: FileVersion) => void
  unstacking?: boolean
  onClose: () => void
}

export function VersionPickerModal({
  fetchUrl,
  currentFileReferenceId,
  reviewBaseUrl,
  onVersionClick,
  onUnstack,
  unstacking,
  onClose,
}: VersionPickerModalProps) {
  const [versions, setVersions] = useState<FileVersion[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(fetchUrl)
        if (res.ok) {
          const json = await res.json()
          if (!cancelled) setVersions(json.data?.versions || [])
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [fetchUrl])

  const isCurrent = (v: FileVersion) => {
    if (currentFileReferenceId) return v.id === currentFileReferenceId
    return v.is_latest
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-md rounded-xl border border-border-subtle bg-surface-raised shadow-xl">
        <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
          <h3 className="text-sm font-semibold text-text-primary">Versions</h3>
          <button
            onClick={onClose}
            className="rounded p-1 text-text-secondary hover:text-text-primary hover:bg-surface-overlay transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {loading ? (
            <div className="space-y-3 p-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3 animate-pulse">
                  <div className="w-20 aspect-video rounded bg-surface-overlay" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 w-3/4 rounded bg-surface-overlay" />
                    <div className="h-3 w-1/2 rounded bg-surface-overlay" />
                  </div>
                </div>
              ))}
            </div>
          ) : versions.length === 0 ? (
            <p className="px-2 py-4 text-center text-sm text-text-secondary">No versions found.</p>
          ) : (
            <div className="space-y-1">
              {versions.map((v) => {
                const current = isCurrent(v)
                return (
                  <div
                    key={v.id}
                    className={`flex items-center gap-3 rounded-lg p-2 ${current ? 'bg-accent/5' : 'hover:bg-surface-overlay'} transition-colors`}
                  >
                    <div className="shrink-0 w-20 aspect-video rounded overflow-hidden relative">
                      {v.thumbnail_url ? (
                        <img src={v.thumbnail_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full" style={{ background: getGradient(v.id) }} />
                      )}
                      {v.duration_seconds != null && v.duration_seconds > 0 && (
                        <span className="absolute bottom-0.5 right-0.5 rounded bg-black/70 px-1 py-0.5 text-xs font-medium text-white tabular-nums">
                          {formatDuration(v.duration_seconds)}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="rounded bg-surface-overlay px-1.5 py-0.5 text-xs font-semibold text-text-primary">
                          v{v.version_number}
                        </span>
                        <p className="truncate text-sm font-medium text-text-primary">{v.name}</p>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-text-secondary">
                        {v.file_size != null && <span>{formatFileSize(v.file_size)}</span>}
                        {v.duration_seconds != null && v.file_size != null && (
                          <span>&middot;</span>
                        )}
                        {v.duration_seconds != null && <span>{formatDuration(v.duration_seconds)}</span>}
                        {(v.file_size != null || v.duration_seconds != null) && (
                          <span>&middot;</span>
                        )}
                        <span>
                          {new Date(v.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      {current ? (
                        <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-accent">
                          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                          Currently viewing
                        </span>
                      ) : reviewBaseUrl ? (
                        <a
                          href={`${reviewBaseUrl}?version=${v.id}`}
                          className="mt-1 inline-block text-xs font-medium text-text-secondary hover:text-accent transition-colors"
                        >
                          View this version
                        </a>
                      ) : onVersionClick ? (
                        <button
                          onClick={() => onVersionClick(v)}
                          className="mt-1 inline-block text-xs font-medium text-text-secondary hover:text-accent transition-colors"
                        >
                          View this version
                        </button>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
        {onUnstack && versions.length > 1 && (
          <div className="border-t border-border-subtle px-4 py-2.5">
            <button
              onClick={() => { const latest = versions.find((v) => v.is_latest); if (latest) onUnstack(latest) }}
              disabled={unstacking}
              className="text-xs text-text-secondary hover:text-error transition-colors disabled:opacity-50"
            >
              {unstacking ? 'Unstacking...' : 'Remove latest from stack'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { formatFileSize } from '@/lib/format'

interface StorageFile {
  id: string
  name: string
  size: number
  mimeType: string | null
  createdAt: string
  episodeId: string | null
  episodeTitle: string | null
  showName: string | null
}

interface StorageData {
  usedBytes: number
  limitBytes: number | null
  usedPercent: number
  remaining: number | null
  breakdown: { show: string; bytes: number }[]
  files: StorageFile[]
}

export default function StorageSettingsPage() {
  const [data, setData] = useState<StorageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<StorageFile | null>(null)
  const [filterShow, setFilterShow] = useState<string>('all')
  const [sortKey, setSortKey] = useState<'date' | 'size' | 'name'>('date')
  const [sortAsc, setSortAsc] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  function loadData() {
    setLoading(true)
    fetch('/api/v1/storage')
      .then(async (res) => {
        if (!res.ok) return null
        const body = await res.json()
        return body.data ?? body
      })
      .then(setData)
      .finally(() => setLoading(false))
  }

  async function handleDelete(file: StorageFile) {
    setDeleting(file.id)
    setConfirmDelete(null)
    try {
      const res = await fetch(`/api/v1/storage/files/${file.id}`, { method: 'DELETE' })
      if (!res.ok && res.status !== 204) {
        const json = await res.json().catch(() => ({ error: 'Delete failed' }))
        throw new Error(json.error || 'Delete failed')
      }
      toast.success(`${file.name} deleted`)
      loadData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete file')
    } finally {
      setDeleting(null)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl">
        <h1 className="text-2xl font-bold text-text-primary mb-8">Storage</h1>
        <div className="animate-pulse h-32 bg-surface-raised rounded-lg" />
      </div>
    )
  }

  if (!data || !data.breakdown) {
    return (
      <div className="max-w-4xl">
        <h1 className="text-2xl font-bold text-text-primary mb-8">Storage</h1>
        <p className="text-sm text-text-secondary">Failed to load storage data.</p>
      </div>
    )
  }

  const percent = Math.min(data.usedPercent, 100)
  const isNearLimit = percent >= 80
  const isOverLimit = percent >= 95
  const limitLabel = data.limitBytes ? formatFileSize(data.limitBytes) : 'Unlimited'
  const showNames = ['all', ...data.breakdown.map((b) => b.show)]

  const filtered = filterShow === 'all' ? data.files : data.files.filter((f) => f.showName === filterShow)
  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0
    if (sortKey === 'date') cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    else if (sortKey === 'size') cmp = a.size - b.size
    else if (sortKey === 'name') cmp = a.name.localeCompare(b.name)
    return sortAsc ? cmp : -cmp
  })

  function toggleSort(key: typeof sortKey) {
    if (sortKey === key) setSortAsc(!sortAsc)
    else { setSortKey(key); setSortAsc(key === 'name') }
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-text-primary mb-8">Storage</h1>

      <div className="border border-border-subtle rounded-lg p-6 bg-surface-raised mb-6">
        <div className="flex items-baseline justify-between mb-3">
          <span className="text-sm font-medium text-text-primary">
            {formatFileSize(data.usedBytes)} <span className="text-text-secondary">of {limitLabel} used</span>
          </span>
          <span className={`text-xs font-medium ${isOverLimit ? 'text-red-400' : isNearLimit ? 'text-amber-400' : 'text-text-tertiary'}`}>
            {percent.toFixed(1)}%
          </span>
        </div>
        <div className="h-2.5 bg-surface-overlay rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${isOverLimit ? 'bg-red-500' : isNearLimit ? 'bg-amber-500' : 'bg-accent'}`}
            style={{ width: `${percent}%` }}
          />
        </div>
        {data.remaining !== null && (
          <p className="text-xs text-text-tertiary mt-2">{formatFileSize(data.remaining)} remaining</p>
        )}
      </div>

      {isNearLimit && (
        <div className={`border rounded-lg p-4 mb-6 ${isOverLimit ? 'border-red-500/30 bg-red-500/5' : 'border-amber-500/30 bg-amber-500/5'}`}>
          <p className={`text-sm font-medium ${isOverLimit ? 'text-red-400' : 'text-amber-400'}`}>
            {isOverLimit ? 'Storage almost full' : 'Running low on storage'}
          </p>
          <p className="text-xs text-text-secondary mt-1">
            Delete files below or upgrade your plan for more storage.
          </p>
        </div>
      )}

      <div className="border border-border-subtle rounded-lg bg-surface-raised overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border-subtle">
          <h2 className="text-sm font-semibold text-text-primary">Files ({data.files.length})</h2>
          {showNames.length > 2 && (
            <select
              value={filterShow}
              onChange={(e) => setFilterShow(e.target.value)}
              className="rounded border border-border-default bg-surface-input px-2 py-1 text-xs text-text-primary focus:border-accent focus:outline-none"
            >
              {showNames.map((s) => (
                <option key={s} value={s}>{s === 'all' ? 'All shows' : s}</option>
              ))}
            </select>
          )}
        </div>

        {sorted.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm text-text-secondary">No files stored yet.</p>
            <p className="text-xs text-text-tertiary mt-1">Upload files to episodes and they will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[600px]">
              <thead>
                <tr className="text-xs font-medium text-text-secondary border-b border-border-subtle">
                  <th className="px-5 py-2.5">
                    <button onClick={() => toggleSort('name')} className="inline-flex items-center gap-1 hover:text-text-primary transition-colors">
                      Name {sortKey === 'name' && <SortArrow asc={sortAsc} />}
                    </button>
                  </th>
                  <th className="px-3 py-2.5 w-24">Show</th>
                  <th className="px-3 py-2.5 w-32">Episode</th>
                  <th className="px-3 py-2.5 w-20">
                    <button onClick={() => toggleSort('size')} className="inline-flex items-center gap-1 hover:text-text-primary transition-colors">
                      Size {sortKey === 'size' && <SortArrow asc={sortAsc} />}
                    </button>
                  </th>
                  <th className="px-3 py-2.5 w-24">
                    <button onClick={() => toggleSort('date')} className="inline-flex items-center gap-1 hover:text-text-primary transition-colors">
                      Uploaded {sortKey === 'date' && <SortArrow asc={sortAsc} />}
                    </button>
                  </th>
                  <th className="px-3 py-2.5 w-16" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {sorted.map((file) => (
                  <tr key={file.id} className="group">
                    <td className="px-5 py-2.5">
                      <p className="text-sm text-text-primary truncate max-w-[280px]" title={file.name}>{file.name}</p>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-text-secondary truncate max-w-[120px]">{file.showName || '—'}</td>
                    <td className="px-3 py-2.5 text-xs text-text-secondary truncate max-w-[160px]">{file.episodeTitle || '—'}</td>
                    <td className="px-3 py-2.5 text-xs text-text-secondary tabular-nums">{formatFileSize(file.size)}</td>
                    <td className="px-3 py-2.5 text-xs text-text-secondary">
                      {new Date(file.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <button
                        onClick={() => setConfirmDelete(file)}
                        disabled={deleting === file.id}
                        className="rounded p-1 text-text-tertiary opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-red-400/10 transition-all disabled:opacity-50"
                        title="Delete file"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={(e) => { if (e.target === e.currentTarget) setConfirmDelete(null) }}>
          <div className="w-full max-w-sm rounded-xl border border-border-subtle bg-surface-raised p-6 shadow-xl">
            <h3 className="text-base font-semibold text-text-primary">Delete file</h3>
            <p className="mt-2 text-sm text-text-secondary">
              Permanently delete <span className="font-medium text-text-primary">{confirmDelete.name}</span> ({formatFileSize(confirmDelete.size)})? This cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                disabled={deleting !== null}
                className="rounded-md bg-red-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SortArrow({ asc }: { asc: boolean }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" fill="currentColor" className={`h-3 w-3 transition-transform ${asc ? 'rotate-180' : ''}`}>
      <path d="M6 8.25a.75.75 0 0 1-.53-.22l-2.5-2.5a.75.75 0 1 1 1.06-1.06L6 6.44l1.97-1.97a.75.75 0 1 1 1.06 1.06l-2.5 2.5a.75.75 0 0 1-.53.22Z" />
    </svg>
  )
}

'use client'

import { useState, useEffect, useCallback } from 'react'
import { FilePickerBreadcrumb } from './file-picker-breadcrumb'
import { FilePickerItem } from './file-picker-item'

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

interface FilePickerModalProps {
  provider: string
  open: boolean
  onClose: () => void
  onSelect: (item: BrowseItem) => void
}

interface BreadcrumbEntry {
  id: string
  name: string
  path?: string
}

export function FilePickerModal({ provider, open, onClose, onSelect }: FilePickerModalProps) {
  const [items, setItems] = useState<BrowseItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [currentPath, setCurrentPath] = useState<string | undefined>(undefined)
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbEntry[]>([{ id: 'root', name: 'Workspaces' }])
  const [cursor, setCursor] = useState<string | undefined>(undefined)

  const fetchItems = useCallback(async (path?: string, nextCursor?: string) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (path) params.set('path', path)
      if (nextCursor) params.set('cursor', nextCursor)
      const res = await fetch(`/api/v1/integrations/${provider}/browse?${params}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to browse')
      const data = json.data
      if (nextCursor) {
        setItems((prev) => [...prev, ...data.items])
      } else {
        setItems(data.items)
      }
      setCursor(data.pagination?.cursor)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [provider])

  useEffect(() => {
    if (open) {
      setItems([])
      setSelectedId(null)
      setCurrentPath(undefined)
      setBreadcrumb([{ id: 'root', name: 'Workspaces' }])
      setCursor(undefined)
      fetchItems()
    }
  }, [open, fetchItems])

  function handleNavigate(item: BrowseItem) {
    let newPath: string
    const accountId = currentPath?.split(':')[1] || ''

    if (item.type === 'workspace') {
      newPath = `workspace:${accountId || item.id}:${item.id}`
    } else if (item.type === 'project') {
      newPath = `project:${accountId}:${item.id}`
    } else {
      newPath = `folder:${accountId}:${item.id}`
    }

    setCurrentPath(newPath)
    setSelectedId(null)
    setCursor(undefined)
    setBreadcrumb((prev) => [...prev, { id: item.id, name: item.name, path: newPath }])
    fetchItems(newPath)
  }

  function handleBreadcrumbNavigate(path?: string) {
    setCurrentPath(path)
    setSelectedId(null)
    setCursor(undefined)
    const idx = path
      ? breadcrumb.findIndex((b) => b.path === path)
      : 0
    setBreadcrumb(breadcrumb.slice(0, idx + 1))
    fetchItems(path)
  }

  function handleConfirm() {
    const item = items.find((i) => i.id === selectedId)
    if (item) {
      onSelect(item)
      onClose()
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-surface-base border border-border-subtle rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text-primary">Browse Frame.io</h2>
          <button onClick={onClose} className="text-text-tertiary hover:text-text-primary text-lg">&times;</button>
        </div>

        <div className="px-5 py-2 border-b border-border-subtle">
          <FilePickerBreadcrumb items={breadcrumb} onNavigate={handleBreadcrumbNavigate} />
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2 min-h-[300px]">
          {error && (
            <div className="rounded-md bg-error/10 border border-error/30 px-3 py-2 text-xs text-error">{error}</div>
          )}

          {loading && items.length === 0 && (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-text-tertiary">Loading...</p>
            </div>
          )}

          {!loading && items.length === 0 && !error && (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-text-tertiary">This folder is empty.</p>
            </div>
          )}

          {items.map((item) => (
            <FilePickerItem
              key={item.id}
              id={item.id}
              name={item.name}
              type={item.type}
              thumbnailUrl={item.thumbnailUrl}
              fileSize={item.fileSize}
              durationSeconds={item.durationSeconds}
              selected={selectedId === item.id}
              onNavigate={() => handleNavigate(item)}
              onSelect={() => setSelectedId(item.id)}
            />
          ))}

          {cursor && (
            <button
              onClick={() => fetchItems(currentPath, cursor)}
              disabled={loading}
              className="w-full text-center py-2 text-xs text-accent hover:text-accent-hover disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Load more'}
            </button>
          )}
        </div>

        <div className="px-5 py-3 border-t border-border-subtle flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="text-xs text-text-tertiary hover:text-text-secondary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedId}
            className="rounded-md bg-accent px-4 py-1.5 text-xs font-semibold text-white hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Select
          </button>
        </div>
      </div>
    </div>
  )
}

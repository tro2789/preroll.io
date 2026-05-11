'use client'

import { useState, useEffect, useCallback } from 'react'
import { FilePickerBreadcrumb } from './file-picker-breadcrumb'
import { ProviderLogo } from './provider-logo'

interface BrowseItem {
  id: string
  name: string
  type: 'folder' | 'file' | 'project' | 'workspace'
  thumbnailUrl?: string
  viewUrl?: string
  metadata?: Record<string, unknown>
}

interface BreadcrumbEntry {
  id: string
  name: string
  path?: string
}

interface ProjectPickerModalProps {
  provider: string
  providerDisplayName: string
  open: boolean
  onClose: () => void
  onSelect: (item: BrowseItem) => void
}

const selectableTypes = new Set(['project', 'folder'])

export function ProjectPickerModal({ provider, providerDisplayName, open, onClose, onSelect }: ProjectPickerModalProps) {
  const [items, setItems] = useState<BrowseItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [currentPath, setCurrentPath] = useState<string | undefined>(undefined)
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbEntry[]>([{ id: 'root', name: providerDisplayName }])
  const [cursor, setCursor] = useState<string | undefined>(undefined)
  const [accountId, setAccountId] = useState('')

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
      if (data.accountId) setAccountId(data.accountId)
      const navigable = (data.items as BrowseItem[]).filter(
        (i) => i.type !== 'file'
      )
      if (nextCursor) {
        setItems((prev) => [...prev, ...navigable])
      } else {
        setItems(navigable)
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
      setBreadcrumb([{ id: 'root', name: providerDisplayName }])
      setCursor(undefined)
      fetchItems()
    }
  }, [open, fetchItems, providerDisplayName])

  function handleNavigate(item: BrowseItem) {
    const newPath = item.type === 'workspace'
      ? `workspace:${accountId}:${item.id}`
      : item.type === 'project'
        ? `project:${accountId}:${item.id}`
        : `folder:${accountId}:${item.id}`

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
    const idx = path ? breadcrumb.findIndex((b) => b.path === path) : 0
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

  const typeIcons: Record<string, string> = {
    workspace: '■',
    project: '▣',
    folder: '▷',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-surface-base border border-border-subtle rounded-xl shadow-xl w-full max-w-lg max-h-[70vh] flex flex-col">
        <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ProviderLogo provider={provider} className="w-6 h-6" />
            <h2 className="text-sm font-semibold text-text-primary">
              Link existing {provider === 'google_drive' ? 'folder' : 'project'}
            </h2>
          </div>
          <button onClick={onClose} className="text-text-tertiary hover:text-text-primary text-lg">&times;</button>
        </div>

        <div className="px-5 py-2 border-b border-border-subtle">
          <FilePickerBreadcrumb items={breadcrumb} onNavigate={handleBreadcrumbNavigate} />
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-1.5 min-h-[240px]">
          {error && (
            <div className="rounded-md bg-error/10 border border-error/30 px-3 py-2 text-xs text-error">{error}</div>
          )}

          {loading && items.length === 0 && (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-text-secondary">Loading...</p>
            </div>
          )}

          {!loading && items.length === 0 && !error && (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-text-secondary">Nothing here.</p>
            </div>
          )}

          {items.map((item) => {
            const isSelectable = selectableTypes.has(item.type)
            const isSelected = selectedId === item.id

            return (
              <div key={item.id} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (isSelectable) {
                      setSelectedId(isSelected ? null : item.id)
                    } else {
                      handleNavigate(item)
                    }
                  }}
                  className={`flex-1 text-left rounded-lg border p-3 transition-colors group ${
                    isSelected
                      ? 'border-accent bg-accent/5'
                      : 'border-border-subtle bg-surface-raised hover:border-border-default'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-surface-overlay flex items-center justify-center shrink-0">
                      <span className="text-text-tertiary text-sm">{typeIcons[item.type] || '▷'}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm truncate transition-colors ${isSelected ? 'text-accent' : 'text-text-primary group-hover:text-accent'}`}>
                        {item.name}
                      </p>
                      <span className="text-xs text-text-secondary capitalize">{item.type}</span>
                    </div>
                    {!isSelectable && (
                      <span className="text-text-tertiary text-sm shrink-0">&rarr;</span>
                    )}
                  </div>
                </button>
                {isSelectable && (
                  <button
                    type="button"
                    onClick={() => handleNavigate(item)}
                    className="shrink-0 rounded-md border border-border-subtle px-2 py-2 text-text-tertiary hover:text-text-primary hover:border-border-default transition-colors"
                    title="Browse contents"
                  >
                    <span className="text-xs">&rarr;</span>
                  </button>
                )}
              </div>
            )
          })}

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
          <button onClick={onClose} className="text-xs text-text-secondary hover:text-text-primary transition-colors">
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedId}
            className="rounded-md bg-accent px-4 py-1.5 text-xs font-semibold text-white hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Link {provider === 'google_drive' ? 'Folder' : 'Project'}
          </button>
        </div>
      </div>
    </div>
  )
}

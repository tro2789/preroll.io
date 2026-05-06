'use client'

import { useState, useEffect } from 'react'
import type { EpisodeTag } from '@/lib/kanban/types'

interface Show {
  id: string
  name: string
}

export type GroupBy = 'none' | 'client' | 'show'

interface BoardToolbarProps {
  shows?: Show[]
  groupBy?: GroupBy
  onGroupByChange?: (g: GroupBy) => void
  onFilterChange: (filters: BoardFilters) => void
  compact?: boolean
  onCompactChange?: () => void
}

export interface BoardFilters {
  search: string
  overdueOnly: boolean
  showId: string | null
  tagIds: string[]
}

export function BoardToolbar({ shows, groupBy, onGroupByChange, onFilterChange, compact, onCompactChange }: BoardToolbarProps) {
  const defaultFilters: BoardFilters = { search: '', overdueOnly: false, showId: null, tagIds: [] }
  const [filters, setFilters] = useState<BoardFilters>(defaultFilters)
  const [tags, setTags] = useState<EpisodeTag[]>([])

  useEffect(() => {
    fetch('/api/v1/tags')
      .then((r) => r.json())
      .then((json) => setTags(json.data || []))
      .catch(() => {})
  }, [])

  function update(partial: Partial<BoardFilters>) {
    const next: BoardFilters = {
      ...filters,
      ...partial,
    }
    setFilters(next)
    onFilterChange(next)
  }

  function toggleTag(id: string) {
    const next = filters.tagIds.includes(id)
      ? filters.tagIds.filter((t) => t !== id)
      : [...filters.tagIds, id]
    update({ tagIds: next })
  }

  const hasFilters = filters.search || filters.overdueOnly || filters.showId || filters.tagIds.length > 0

  return (
    <div className="flex items-center gap-2 mb-4 flex-wrap">
      <div className="relative flex-1 min-w-[180px] max-w-xs">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-tertiary pointer-events-none"
        >
          <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
        </svg>
        <input
          type="text"
          value={filters.search}
          onChange={(e) => update({ search: e.target.value })}
          placeholder="Search episodes..."
          className="w-full rounded-md border border-border-subtle bg-surface-input pl-8 pr-3 py-1.5 text-xs text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
        />
      </div>

      <button
        onClick={() => update({ overdueOnly: !filters.overdueOnly })}
        className={`shrink-0 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors ${
          filters.overdueOnly
            ? 'border-red-500/40 bg-red-500/10 text-red-400'
            : 'border-border-subtle bg-surface-overlay text-text-tertiary hover:text-text-secondary hover:border-border-default'
        }`}
      >
        Overdue
      </button>

      {tags.length > 0 && tags.map((tag) => (
        <button
          key={tag.id}
          onClick={() => toggleTag(tag.id)}
          className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
            filters.tagIds.includes(tag.id)
              ? 'border-current'
              : 'border-transparent opacity-60 hover:opacity-100'
          }`}
          style={{
            backgroundColor: `${tag.color}${filters.tagIds.includes(tag.id) ? '30' : '15'}`,
            color: tag.color,
          }}
        >
          {tag.name}
        </button>
      ))}

      {shows && shows.length > 1 && (
        <select
          value={filters.showId || ''}
          onChange={(e) => update({ showId: e.target.value || null })}
          className="shrink-0 rounded-md border border-border-subtle bg-surface-input px-2.5 py-1.5 text-xs text-text-secondary focus:border-accent focus:outline-none"
        >
          <option value="">All Shows</option>
          {shows.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      )}

      {onGroupByChange && (
        <select
          value={groupBy || 'none'}
          onChange={(e) => onGroupByChange(e.target.value as GroupBy)}
          className="shrink-0 rounded-md border border-border-subtle bg-surface-input px-2.5 py-1.5 text-xs text-text-secondary focus:border-accent focus:outline-none"
        >
          <option value="none">No grouping</option>
          <option value="client">Group by Client</option>
          <option value="show">Group by Show</option>
        </select>
      )}

      {hasFilters && (
        <button
          onClick={() => {
            setFilters(defaultFilters)
            onFilterChange(defaultFilters)
          }}
          className="shrink-0 text-xs text-text-tertiary hover:text-text-primary transition-colors"
        >
          Clear
        </button>
      )}

      {onCompactChange && (
        <button
          onClick={onCompactChange}
          title={compact ? 'Card view' : 'Compact view'}
          className="shrink-0 ml-auto rounded-md border border-border-subtle bg-surface-overlay p-1.5 text-text-tertiary hover:text-text-secondary hover:border-border-default transition-colors"
        >
          {compact ? (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
              <path fillRule="evenodd" d="M4.25 2A2.25 2.25 0 002 4.25v2.5A2.25 2.25 0 004.25 9h2.5A2.25 2.25 0 009 6.75v-2.5A2.25 2.25 0 006.75 2h-2.5zm0 9A2.25 2.25 0 002 13.25v2.5A2.25 2.25 0 004.25 18h2.5A2.25 2.25 0 009 15.75v-2.5A2.25 2.25 0 006.75 11h-2.5zm9-9A2.25 2.25 0 0011 4.25v2.5A2.25 2.25 0 0013.25 9h2.5A2.25 2.25 0 0018 6.75v-2.5A2.25 2.25 0 0015.75 2h-2.5zm0 9A2.25 2.25 0 0011 13.25v2.5A2.25 2.25 0 0013.25 18h2.5A2.25 2.25 0 0018 15.75v-2.5A2.25 2.25 0 0015.75 11h-2.5z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
              <path fillRule="evenodd" d="M2 3.75A.75.75 0 012.75 3h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 3.75zm0 4.167a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75zm0 4.166a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75zm0 4.167a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75z" clipRule="evenodd" />
            </svg>
          )}
        </button>
      )}
    </div>
  )
}

export function applyFilters<T extends {
  title: string
  scheduled_publish_date: string | null
  show_id: string
  tags?: { id: string }[]
}>(episodes: T[], filters: BoardFilters): T[] {
  let result = episodes

  if (filters.search) {
    const q = filters.search.toLowerCase()
    result = result.filter((ep) => ep.title.toLowerCase().includes(q))
  }

  if (filters.overdueOnly) {
    const today = new Date().toISOString().split('T')[0]
    result = result.filter(
      (ep) => ep.scheduled_publish_date && ep.scheduled_publish_date < today
    )
  }

  if (filters.showId) {
    result = result.filter((ep) => ep.show_id === filters.showId)
  }

  if (filters.tagIds.length > 0) {
    result = result.filter((ep) =>
      ep.tags && filters.tagIds.some((tid) => ep.tags!.some((t) => t.id === tid))
    )
  }

  return result
}

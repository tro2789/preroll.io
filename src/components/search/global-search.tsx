'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface SearchEpisode {
  id: string
  title: string
  episode_number: number | null
  status: string
  show_id: string
  show_name: string | null
}

interface SearchShow {
  id: string
  name: string
}

interface SearchClient {
  id: string
  name: string
  company: string | null
}

interface GlobalSearchProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [episodes, setEpisodes] = useState<SearchEpisode[]>([])
  const [shows, setShows] = useState<SearchShow[]>([])
  const [clients, setClients] = useState<SearchClient[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const allResults = [
    ...clients.map(c => ({ type: 'client' as const, ...c })),
    ...shows.map(s => ({ type: 'show' as const, ...s })),
    ...episodes.map(e => ({ type: 'episode' as const, ...e })),
  ]

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => {
        inputRef.current?.focus()
      })
    } else {
      setQuery('')
      setEpisodes([])
      setShows([])
      setClients([])
      setSelectedIndex(0)
    }
  }, [open])

  useEffect(() => {
    if (!query || query.length < 2) {
      setEpisodes([])
      setShows([])
      setClients([])
      return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setLoading(true)
      fetch(`/api/v1/search?q=${encodeURIComponent(query)}`)
        .then(r => r.json())
        .then(json => {
          const d = json.data || json
          setEpisodes(d.episodes || [])
          setShows(d.shows || [])
          setClients(d.clients || [])
          setSelectedIndex(0)
        })
        .catch(() => {})
        .finally(() => setLoading(false))
    }, 200)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  const navigate = useCallback((item: typeof allResults[number]) => {
    onOpenChange(false)
    if (item.type === 'client') {
      router.push(`/app/clients/${item.id}`)
    } else if (item.type === 'show') {
      router.push(`/app/shows/${item.id}`)
    } else if (item.type === 'episode') {
      const ep = item as SearchEpisode & { type: 'episode' }
      router.push(`/app/shows/${ep.show_id}/episodes/${ep.id}`)
    }
  }, [router, onOpenChange])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onOpenChange(false)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(i => Math.min(i + 1, allResults.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && allResults.length > 0) {
      e.preventDefault()
      navigate(allResults[selectedIndex])
    }
  }, [allResults, selectedIndex, navigate, onOpenChange])

  if (!open) return null

  const hasResults = allResults.length > 0
  const hasQuery = query.length >= 2

  let resultIndex = 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4 bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onOpenChange(false) }}
    >
      <div className="w-full max-w-lg rounded-xl border border-border-subtle bg-surface-raised shadow-xl overflow-hidden">
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border-subtle">
          <svg className="h-4 w-4 text-text-tertiary shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search episodes, shows, clients..."
            className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none"
          />
          {loading && (
            <div className="h-4 w-4 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          )}
          <kbd className="bg-surface-overlay border border-border-subtle rounded px-1.5 py-0.5 text-[10px] font-mono text-fg-faint">ESC</kbd>
        </div>

        {hasQuery && (
          <div className="max-h-[360px] overflow-y-auto">
            {!hasResults && !loading && (
              <div className="px-4 py-8 text-center text-sm text-text-secondary">
                No results for &ldquo;{query}&rdquo;
              </div>
            )}

            {clients.length > 0 && (
              <div>
                <div className="px-4 pt-3 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-fg-faint">Clients</div>
                {clients.map(c => {
                  const idx = resultIndex++
                  return (
                    <button
                      key={c.id}
                      onClick={() => navigate({ type: 'client', ...c })}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${
                        selectedIndex === idx ? 'bg-accent/10' : 'hover:bg-surface-overlay'
                      }`}
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-surface-overlay border border-border-subtle text-[11px] font-semibold text-text-secondary shrink-0">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">{c.name}</p>
                        {c.company && <p className="text-xs text-text-secondary truncate">{c.company}</p>}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}

            {shows.length > 0 && (
              <div>
                <div className="px-4 pt-3 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-fg-faint">Shows</div>
                {shows.map(s => {
                  const idx = resultIndex++
                  return (
                    <button
                      key={s.id}
                      onClick={() => navigate({ type: 'show', ...s })}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${
                        selectedIndex === idx ? 'bg-accent/10' : 'hover:bg-surface-overlay'
                      }`}
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-surface-overlay border border-border-subtle shrink-0">
                        <svg className="h-3.5 w-3.5 text-text-secondary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
                        </svg>
                      </div>
                      <p className="text-sm font-medium text-text-primary truncate">{s.name}</p>
                    </button>
                  )
                })}
              </div>
            )}

            {episodes.length > 0 && (
              <div>
                <div className="px-4 pt-3 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-fg-faint">Episodes</div>
                {episodes.map(ep => {
                  const idx = resultIndex++
                  return (
                    <button
                      key={ep.id}
                      onClick={() => navigate({ type: 'episode', ...ep })}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${
                        selectedIndex === idx ? 'bg-accent/10' : 'hover:bg-surface-overlay'
                      }`}
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-surface-overlay border border-border-subtle text-[11px] font-mono text-text-secondary shrink-0">
                        {ep.episode_number ?? '#'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">{ep.title}</p>
                        {ep.show_name && <p className="text-xs text-text-secondary truncate">{ep.show_name}</p>}
                      </div>
                      <span className={`ml-auto shrink-0 text-[11px] font-medium px-1.5 py-0.5 rounded-full ${
                        ep.status === 'published'
                          ? 'text-emerald-400 bg-emerald-500/10'
                          : 'text-text-secondary bg-surface-overlay'
                      }`}>
                        {ep.status}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}

            {hasResults && <div className="h-2" />}
          </div>
        )}

        {!hasQuery && (
          <div className="px-4 py-6 text-center text-sm text-text-secondary">
            Type to search across episodes, shows, and clients
          </div>
        )}
      </div>
    </div>
  )
}

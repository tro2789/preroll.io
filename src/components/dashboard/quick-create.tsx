'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Show {
  id: string
  name: string
}

type CreateMode = null | 'episode' | 'show'

export function QuickCreate() {
  const router = useRouter()
  const [mode, setMode] = useState<CreateMode>(null)
  const [shows, setShows] = useState<Show[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [showId, setShowId] = useState('')
  const [title, setTitle] = useState('')
  const [episodeNumber, setEpisodeNumber] = useState('')

  const [showName, setShowName] = useState('')
  const [clientId, setClientId] = useState('')
  const [clients, setClients] = useState<{ id: string; name: string }[]>([])

  useEffect(() => {
    if (mode === 'episode') {
      fetch('/api/v1/shows').then(r => r.json()).then(json => {
        const data = json.data || []
        setShows(data)
        if (data.length === 1) setShowId(data[0].id)
      })
    }
    if (mode === 'show') {
      fetch('/api/v1/clients').then(r => r.json()).then(json => {
        const data = json.data || []
        setClients(data)
        if (data.length === 1) setClientId(data[0].id)
      })
    }
  }, [mode])

  function reset() {
    setMode(null)
    setTitle('')
    setEpisodeNumber('')
    setShowId('')
    setShowName('')
    setClientId('')
    setError(null)
  }

  async function handleCreateEpisode(e: React.FormEvent) {
    e.preventDefault()
    if (!showId || !title.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/v1/shows/${showId}/episodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          episode_number: episodeNumber ? Number(episodeNumber) : null,
        }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({ error: 'Failed' }))
        throw new Error(json.error || 'Failed to create episode')
      }
      const { data } = await res.json()
      reset()
      router.push(`/app/shows/${showId}/episodes/${data.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateShow(e: React.FormEvent) {
    e.preventDefault()
    if (!clientId || !showName.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/v1/shows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          name: showName.trim(),
        }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({ error: 'Failed' }))
        throw new Error(json.error || 'Failed to create show')
      }
      const { data } = await res.json()
      reset()
      router.push(`/app/shows/${data.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (!mode) {
    return (
      <button
        onClick={() => setMode('episode')}
        className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-hover transition-colors"
      >
        + New Project
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-border-subtle bg-surface-raised shadow-xl">
        {/* Mode tabs */}
        <div className="flex border-b border-border-subtle">
          <button
            onClick={() => { setMode('episode'); setError(null) }}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${mode === 'episode' ? 'text-text-primary border-b-2 border-accent' : 'text-text-tertiary hover:text-text-secondary'}`}
          >
            New Episode
          </button>
          <button
            onClick={() => { setMode('show'); setError(null) }}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${mode === 'show' ? 'text-text-primary border-b-2 border-accent' : 'text-text-tertiary hover:text-text-secondary'}`}
          >
            New Show
          </button>
        </div>

        <div className="p-5">
          {error && <div className="mb-4 rounded bg-error/10 border border-error/30 px-3 py-2 text-xs text-error">{error}</div>}

          {mode === 'episode' && (
            <form onSubmit={handleCreateEpisode} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-text-tertiary mb-1">Show</label>
                <select
                  value={showId}
                  onChange={(e) => setShowId(e.target.value)}
                  required
                  className="block w-full rounded-md border border-border-default bg-surface-input px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
                >
                  <option value="">Select a show</option>
                  {shows.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-tertiary mb-1">Episode Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  placeholder="e.g. The Art of Delegation"
                  className="block w-full rounded-md border border-border-default bg-surface-input px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-tertiary mb-1">Episode Number <span className="text-text-tertiary font-normal">(optional)</span></label>
                <input
                  type="number"
                  value={episodeNumber}
                  onChange={(e) => setEpisodeNumber(e.target.value)}
                  placeholder="e.g. 42"
                  className="block w-24 rounded-md border border-border-default bg-surface-input px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={loading || !showId || !title.trim()}
                  className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Episode'}
                </button>
                <button type="button" onClick={reset} className="text-sm text-text-tertiary hover:text-text-primary transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          )}

          {mode === 'show' && (
            <form onSubmit={handleCreateShow} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-text-tertiary mb-1">Client</label>
                <select
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  required
                  className="block w-full rounded-md border border-border-default bg-surface-input px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
                >
                  <option value="">Select a client</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-tertiary mb-1">Show Name</label>
                <input
                  type="text"
                  value={showName}
                  onChange={(e) => setShowName(e.target.value)}
                  required
                  placeholder="e.g. Brain Waves"
                  className="block w-full rounded-md border border-border-default bg-surface-input px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={loading || !clientId || !showName.trim()}
                  className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Show'}
                </button>
                <button type="button" onClick={reset} className="text-sm text-text-tertiary hover:text-text-primary transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

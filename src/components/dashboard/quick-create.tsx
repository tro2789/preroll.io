'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'

interface Client {
  id: string
  name: string
  company: string | null
}

interface Show {
  id: string
  name: string
  client_id: string
}

type Step = 'client' | 'show' | 'episode'
const STEPS: Step[] = ['client', 'show', 'episode']
const SEARCH_THRESHOLD = 7

export function QuickCreate() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>('client')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Data
  const [clients, setClients] = useState<Client[]>([])
  const [shows, setShows] = useState<Show[]>([])
  const [clientsLoading, setClientsLoading] = useState(false)
  const [showsLoading, setShowsLoading] = useState(false)

  // Selections
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [selectedShowId, setSelectedShowId] = useState<string | null>(null)

  // Inline creation
  const [creatingClient, setCreatingClient] = useState(false)
  const [newClientName, setNewClientName] = useState('')
  const [newClientCompany, setNewClientCompany] = useState('')

  const [creatingShow, setCreatingShow] = useState(false)
  const [newShowName, setNewShowName] = useState('')

  // Search filters
  const [clientSearch, setClientSearch] = useState('')
  const [showSearch, setShowSearch] = useState('')

  // Episode fields
  const [episodeTitle, setEpisodeTitle] = useState('')
  const [episodeNumber, setEpisodeNumber] = useState('')

  const selectedClient = clients.find(c => c.id === selectedClientId) ?? null

  const filteredClients = useMemo(() => {
    if (!clientSearch.trim()) return clients
    const q = clientSearch.toLowerCase()
    return clients.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.company && c.company.toLowerCase().includes(q))
    )
  }, [clients, clientSearch])

  const filteredShows = useMemo(() => {
    if (!showSearch.trim()) return shows
    const q = showSearch.toLowerCase()
    return shows.filter(s => s.name.toLowerCase().includes(q))
  }, [shows, showSearch])

  const fetchClients = useCallback(async () => {
    setClientsLoading(true)
    try {
      const res = await fetch('/api/v1/clients')
      const json = await res.json()
      const data: Client[] = json.data || []
      setClients(data)
      if (data.length === 1) {
        setSelectedClientId(data[0].id)
      }
      if (data.length === 0) {
        setCreatingClient(true)
      }
    } catch {
      setError('Failed to load clients')
    } finally {
      setClientsLoading(false)
    }
  }, [])

  const fetchShows = useCallback(async (clientId: string) => {
    setShowsLoading(true)
    try {
      const res = await fetch(`/api/v1/shows?client_id=${clientId}`)
      const json = await res.json()
      const data: Show[] = json.data || []
      setShows(data)
      if (data.length === 1) {
        setSelectedShowId(data[0].id)
        setCreatingShow(false)
      } else if (data.length === 0) {
        setSelectedShowId(null)
        setCreatingShow(true)
      } else {
        setSelectedShowId(null)
        setCreatingShow(false)
      }
    } catch {
      setError('Failed to load shows')
    } finally {
      setShowsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) fetchClients()
  }, [open, fetchClients])

  function reset() {
    setOpen(false)
    setStep('client')
    setError(null)
    setSelectedClientId(null)
    setSelectedShowId(null)
    setCreatingClient(false)
    setNewClientName('')
    setNewClientCompany('')
    setCreatingShow(false)
    setNewShowName('')
    setEpisodeTitle('')
    setEpisodeNumber('')
    setClientSearch('')
    setShowSearch('')
    setClients([])
    setShows([])
  }

  function goBack() {
    setError(null)
    setShowSearch('')
    const idx = STEPS.indexOf(step)
    if (idx > 0) {
      setStep(STEPS[idx - 1])
    }
  }

  async function handleAdvanceFromClient() {
    setError(null)

    if (creatingClient) {
      if (!newClientName.trim()) return
      setLoading(true)
      try {
        const res = await fetch('/api/v1/clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: newClientName.trim(),
            company: newClientCompany.trim() || null,
          }),
        })
        if (!res.ok) {
          const json = await res.json().catch(() => ({ error: 'Failed' }))
          throw new Error(json.error || 'Failed to create client')
        }
        const { data } = await res.json()
        const newClient: Client = { id: data.id, name: data.name, company: data.company }
        setClients(prev => [...prev, newClient])
        setSelectedClientId(data.id)
        setCreatingClient(false)
        setNewClientName('')
        setNewClientCompany('')
        await fetchShows(data.id)
        setStep('show')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      } finally {
        setLoading(false)
      }
      return
    }

    if (!selectedClientId) return
    await fetchShows(selectedClientId)
    setStep('show')
  }

  async function handleAdvanceFromShow() {
    setError(null)

    if (creatingShow) {
      if (!newShowName.trim() || !selectedClientId) return
      setLoading(true)
      try {
        const res = await fetch('/api/v1/shows', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: selectedClientId,
            name: newShowName.trim(),
          }),
        })
        if (!res.ok) {
          const json = await res.json().catch(() => ({ error: 'Failed' }))
          throw new Error(json.error || 'Failed to create show')
        }
        const { data } = await res.json()
        setShows(prev => [...prev, { id: data.id, name: data.name, client_id: selectedClientId }])
        setSelectedShowId(data.id)
        setCreatingShow(false)
        setNewShowName('')
        setStep('episode')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      } finally {
        setLoading(false)
      }
      return
    }

    if (!selectedShowId) return
    setStep('episode')
  }

  async function handleCreateEpisode(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedShowId || !episodeTitle.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/v1/shows/${selectedShowId}/episodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: episodeTitle.trim(),
          episode_number: episodeNumber ? Number(episodeNumber) : null,
        }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({ error: 'Failed' }))
        throw new Error(json.error || 'Failed to create episode')
      }
      const { data } = await res.json()
      reset()
      router.push(`/app/shows/${selectedShowId}/episodes/${data.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-hover transition-colors"
      >
        + New Project
      </button>
    )
  }

  const stepIndex = STEPS.indexOf(step)

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4 bg-black/60 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) reset() }}>
      <div className="w-full max-w-md rounded-xl border border-border-subtle bg-surface-raised shadow-xl">
        {/* Step indicator */}
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-center justify-between mb-1">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center flex-1">
                <div className="flex items-center gap-2">
                  <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                    i < stepIndex
                      ? 'bg-success text-white'
                      : i === stepIndex
                        ? 'bg-accent text-white'
                        : 'bg-surface-input text-text-tertiary border border-border-default'
                  }`}>
                    {i < stepIndex ? '✓' : i + 1}
                  </div>
                  <span className={`text-xs font-medium capitalize ${
                    i === stepIndex ? 'text-text-primary' : 'text-text-tertiary'
                  }`}>
                    {s}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 mx-3 h-px ${i < stepIndex ? 'bg-success' : 'bg-border-default'}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-border-subtle" />

        <div className="p-5">
          {error && (
            <div className="mb-4 rounded-md bg-error/10 border border-error/30 px-3 py-2 text-xs text-error">
              {error}
            </div>
          )}

          {/* Step 1: Client */}
          {step === 'client' && (
            <div className="space-y-3">
              <p className="text-sm text-text-secondary">
                Which client is this project for?
              </p>

              {clientsLoading ? (
                <div className="py-6 text-center text-xs text-text-tertiary">Loading clients...</div>
              ) : (
                <>
                  {!creatingClient && clients.length > 0 && (
                    <>
                      {clients.length >= SEARCH_THRESHOLD && (
                        <input
                          type="text"
                          value={clientSearch}
                          onChange={e => setClientSearch(e.target.value)}
                          placeholder="Search clients..."
                          autoFocus
                          className="block w-full rounded-md border border-border-default bg-surface-input px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
                        />
                      )}
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {filteredClients.length === 0 ? (
                          <div className="py-3 text-center text-xs text-text-tertiary">No clients match &ldquo;{clientSearch}&rdquo;</div>
                        ) : (
                          filteredClients.map(c => (
                            <button
                              key={c.id}
                              onClick={() => setSelectedClientId(c.id)}
                              className={`w-full text-left rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                                selectedClientId === c.id
                                  ? 'border-accent bg-accent/10 text-text-primary'
                                  : 'border-border-default bg-surface-input text-text-secondary hover:border-border-hover hover:text-text-primary'
                              }`}
                            >
                              <span className="font-medium">{c.name}</span>
                              {c.company && (
                                <span className="text-text-tertiary ml-1.5 text-xs">— {c.company}</span>
                              )}
                            </button>
                          ))
                        )}
                      </div>
                    </>
                  )}

                  {!creatingClient && (
                    <button
                      onClick={() => { setCreatingClient(true); setSelectedClientId(null) }}
                      className="text-xs text-accent hover:text-accent-hover transition-colors font-medium"
                    >
                      + Create new client
                    </button>
                  )}

                  {creatingClient && (
                    <div className="space-y-3 rounded-lg border border-border-subtle bg-surface-base p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-text-secondary">New Client</span>
                        {clients.length > 0 && (
                          <button
                            onClick={() => { setCreatingClient(false); setNewClientName(''); setNewClientCompany('') }}
                            className="text-xs text-text-tertiary hover:text-text-primary transition-colors"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-text-tertiary mb-1">Name</label>
                        <input
                          type="text"
                          value={newClientName}
                          onChange={e => setNewClientName(e.target.value)}
                          placeholder="e.g. Acme Corp"
                          autoFocus
                          className="block w-full rounded-md border border-border-default bg-surface-input px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-text-tertiary mb-1">
                          Company <span className="font-normal">(optional)</span>
                        </label>
                        <input
                          type="text"
                          value={newClientCompany}
                          onChange={e => setNewClientCompany(e.target.value)}
                          placeholder="e.g. Acme Corporation"
                          className="block w-full rounded-md border border-border-default bg-surface-input px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="flex items-center justify-between pt-2">
                <button onClick={reset} className="text-sm text-text-tertiary hover:text-text-primary transition-colors">
                  Cancel
                </button>
                <button
                  onClick={handleAdvanceFromClient}
                  disabled={loading || (!selectedClientId && !(creatingClient && newClientName.trim()))}
                  className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
                >
                  {loading ? 'Creating...' : creatingClient ? 'Create & Continue' : 'Next'}
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Show */}
          {step === 'show' && (
            <div className="space-y-3">
              <p className="text-sm text-text-secondary">
                Which show under <span className="font-medium text-text-primary">{selectedClient?.name}</span>?
              </p>

              {showsLoading ? (
                <div className="py-6 text-center text-xs text-text-tertiary">Loading shows...</div>
              ) : (
                <>
                  {!creatingShow && shows.length > 0 && (
                    <>
                      {shows.length >= SEARCH_THRESHOLD && (
                        <input
                          type="text"
                          value={showSearch}
                          onChange={e => setShowSearch(e.target.value)}
                          placeholder="Search shows..."
                          autoFocus
                          className="block w-full rounded-md border border-border-default bg-surface-input px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
                        />
                      )}
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {filteredShows.length === 0 ? (
                          <div className="py-3 text-center text-xs text-text-tertiary">No shows match &ldquo;{showSearch}&rdquo;</div>
                        ) : (
                          filteredShows.map(s => (
                            <button
                              key={s.id}
                              onClick={() => setSelectedShowId(s.id)}
                              className={`w-full text-left rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                                selectedShowId === s.id
                                  ? 'border-accent bg-accent/10 text-text-primary'
                                  : 'border-border-default bg-surface-input text-text-secondary hover:border-border-hover hover:text-text-primary'
                              }`}
                            >
                              <span className="font-medium">{s.name}</span>
                            </button>
                          ))
                        )}
                      </div>
                    </>
                  )}

                  {!creatingShow && shows.length > 0 && (
                    <button
                      onClick={() => { setCreatingShow(true); setSelectedShowId(null) }}
                      className="text-xs text-accent hover:text-accent-hover transition-colors font-medium"
                    >
                      + Create new show
                    </button>
                  )}

                  {creatingShow && (
                    <div className="space-y-3 rounded-lg border border-border-subtle bg-surface-base p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-text-secondary">New Show</span>
                        {shows.length > 0 && (
                          <button
                            onClick={() => { setCreatingShow(false); setNewShowName('') }}
                            className="text-xs text-text-tertiary hover:text-text-primary transition-colors"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-text-tertiary mb-1">Show Name</label>
                        <input
                          type="text"
                          value={newShowName}
                          onChange={e => setNewShowName(e.target.value)}
                          placeholder="e.g. Brain Waves"
                          autoFocus
                          className="block w-full rounded-md border border-border-default bg-surface-input px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="flex items-center justify-between pt-2">
                <button onClick={goBack} className="text-sm text-text-tertiary hover:text-text-primary transition-colors">
                  ← Back
                </button>
                <button
                  onClick={handleAdvanceFromShow}
                  disabled={loading || (!selectedShowId && !(creatingShow && newShowName.trim()))}
                  className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
                >
                  {loading ? 'Creating...' : creatingShow ? 'Create & Continue' : 'Next'}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Episode */}
          {step === 'episode' && (
            <form onSubmit={handleCreateEpisode} className="space-y-3">
              <p className="text-sm text-text-secondary">
                Create an episode for <span className="font-medium text-text-primary">{shows.find(s => s.id === selectedShowId)?.name}</span>
              </p>
              <div>
                <label className="block text-xs font-medium text-text-tertiary mb-1">Episode Title</label>
                <input
                  type="text"
                  value={episodeTitle}
                  onChange={e => setEpisodeTitle(e.target.value)}
                  required
                  placeholder="e.g. The Art of Delegation"
                  autoFocus
                  className="block w-full rounded-md border border-border-default bg-surface-input px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-tertiary mb-1">
                  Episode Number <span className="font-normal">(optional)</span>
                </label>
                <input
                  type="number"
                  value={episodeNumber}
                  onChange={e => setEpisodeNumber(e.target.value)}
                  placeholder="e.g. 42"
                  className="block w-24 rounded-md border border-border-default bg-surface-input px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
                />
              </div>
              <div className="flex items-center justify-between pt-2">
                <button type="button" onClick={goBack} className="text-sm text-text-tertiary hover:text-text-primary transition-colors">
                  ← Back
                </button>
                <button
                  type="submit"
                  disabled={loading || !episodeTitle.trim()}
                  className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Episode'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

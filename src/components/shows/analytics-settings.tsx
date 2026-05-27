'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

const ANALYTICS_PROVIDER_NAMES: Record<string, string> = {
  apple: 'Apple Podcasts',
  spotify_csv: 'Spotify',
  transistor: 'Transistor',
  castopod: 'Castopod',
}

interface AnalyticsConnection {
  id: string
  provider: string
  external_show_id: string
  sync_status: 'active' | 'paused' | 'error'
  last_synced_at: string | null
  sync_error: string | null
}

export function AnalyticsSettings({ showId, initialMilestones }: { showId: string; initialMilestones?: number[] }) {
  const [connections, setConnections] = useState<AnalyticsConnection[]>([])
  const [loading, setLoading] = useState(true)
  const [activeProvider, setActiveProvider] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [testing, setTesting] = useState(false)
  const [importing, setImporting] = useState(false)
  const csvInputRef = useRef<HTMLInputElement>(null)
  const [milestones, setMilestones] = useState<number[]>(initialMilestones ?? [500, 1000, 5000])
  const [newMilestone, setNewMilestone] = useState('')
  const [savingMilestones, setSavingMilestones] = useState(false)

  // Apple Podcasts credentials
  const [applePrivateKey, setApplePrivateKey] = useState('')
  const [appleKeyId, setAppleKeyId] = useState('')
  const [appleIssuerId, setAppleIssuerId] = useState('')
  const [applePodcastId, setApplePodcastId] = useState('')

  async function fetchConnections() {
    try {
      const res = await fetch(`/api/v1/shows/${showId}/analytics-connections`)
      if (res.ok) {
        const json = await res.json()
        const data = json.data
        setConnections(Array.isArray(data) ? data : data ? [data] : [])
      }
    } catch {
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConnections()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showId])

  const connectedProviders = new Set(connections.map((c) => c.provider))

  async function handleAppleConnect() {
    setConnecting(true)
    try {
      const res = await fetch(`/api/v1/shows/${showId}/analytics-connections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'apple',
          credentials: {
            private_key: applePrivateKey,
            key_id: appleKeyId,
            issuer_id: appleIssuerId,
          },
          external_show_id: applePodcastId,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to connect')
      setConnections((prev) => [...prev.filter((c) => c.provider !== 'apple'), json.data])
      setApplePrivateKey('')
      setAppleKeyId('')
      setAppleIssuerId('')
      setApplePodcastId('')
      setActiveProvider(null)
      toast.success('Apple Podcasts connected')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to connect')
    } finally {
      setConnecting(false)
    }
  }

  async function handleTestConnection(provider: string) {
    setTesting(true)
    try {
      const res = await fetch(`/api/v1/shows/${showId}/analytics-connections/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Connection test failed')
      toast.success('Connection test passed')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Connection test failed')
    } finally {
      setTesting(false)
    }
  }

  async function handleCsvImport(file: File) {
    setImporting(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch(`/api/v1/shows/${showId}/analytics-connections/import-csv`, {
        method: 'POST',
        body: formData,
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'CSV import failed')

      const { imported, skipped, skipped_episodes } = json.data
      if (skipped > 0) {
        toast.success(`Imported ${imported} rows. ${skipped} episode(s) not found: ${skipped_episodes.join(', ')}`)
      } else {
        toast.success(`Imported ${imported} rows from Spotify CSV.`)
      }

      await fetchConnections()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'CSV import failed')
    } finally {
      setImporting(false)
      if (csvInputRef.current) csvInputRef.current.value = ''
    }
  }

  async function handleLinkDistribution() {
    setConnecting(true)
    try {
      const res = await fetch('/api/v1/analytics/link-distribution', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to link')
      const { linked } = json.data
      if (linked > 0) {
        toast.success(`Linked ${linked} distribution provider(s) for analytics`)
        await fetchConnections()
      } else {
        toast('No distribution providers found to link. Connect Transistor or Castopod in the Distribution tab first.')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to link distribution providers')
    } finally {
      setConnecting(false)
    }
  }

  async function saveMilestones(values: number[]) {
    setSavingMilestones(true)
    try {
      const res = await fetch(`/api/v1/shows/${showId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analytics_milestones: values.map((v) => ({ downloads: v })) }),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Failed to save')
      }
      toast.success('Milestones updated')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save milestones')
    } finally {
      setSavingMilestones(false)
    }
  }

  async function handleDisconnect(provider: string) {
    try {
      const res = await fetch(`/api/v1/shows/${showId}/analytics-connections?provider=${provider}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Failed to disconnect')
      }
      setConnections((prev) => prev.filter((c) => c.provider !== provider))
      toast.success(`${ANALYTICS_PROVIDER_NAMES[provider] || provider} disconnected`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to disconnect')
    }
  }

  function syncStatusDot(status: AnalyticsConnection['sync_status']) {
    if (status === 'active') return 'bg-green-500'
    if (status === 'paused') return 'bg-yellow-500'
    return 'bg-red-500'
  }

  function formatLastSynced(dateStr: string | null) {
    if (!dateStr) return 'Never synced'
    const date = new Date(dateStr)
    return `Last synced ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} at ${date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`
  }

  if (loading) return null

  const appleCanConnect =
    applePrivateKey.trim() &&
    appleKeyId.trim() &&
    appleIssuerId.trim() &&
    applePodcastId.trim()

  return (
    <div className="rounded-lg border border-border-subtle bg-surface-raised p-5">
      <h3 className="text-xs font-medium uppercase tracking-wider text-text-secondary">
        Analytics
      </h3>

      {connections.map((conn) => (
        <div key={conn.id} className="mt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={`h-2 w-2 shrink-0 rounded-full ${syncStatusDot(conn.sync_status)}`} />
              <div>
                <p className="text-sm font-medium text-text-primary">
                  {ANALYTICS_PROVIDER_NAMES[conn.provider] || conn.provider}
                </p>
                <p className="text-sm text-text-secondary">
                  ID: {conn.external_show_id}
                  <span className="ml-2 text-xs text-text-tertiary">
                    {formatLastSynced(conn.last_synced_at)}
                  </span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleTestConnection(conn.provider)}
                disabled={testing}
                className="rounded-md border border-border-default bg-surface-base px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
              >
                {testing ? 'Testing...' : 'Test'}
              </button>
              <button
                onClick={() => handleDisconnect(conn.provider)}
                className="rounded-md border border-error/30 bg-error/5 px-3 py-1.5 text-sm font-medium text-error hover:bg-error/10 transition-colors"
              >
                Disconnect
              </button>
            </div>
          </div>
          {conn.sync_error && (
            <p className="mt-1.5 ml-5 text-sm text-error">{conn.sync_error}</p>
          )}
        </div>
      ))}

      <div className="mt-4 space-y-3">
        {/* Apple Podcasts */}
        {!connectedProviders.has('apple') && (
          activeProvider === 'apple' ? (
            <div>
              <p className="text-sm text-text-secondary mb-3">
                Connect to Apple Podcasts Connect to import audience analytics data.
              </p>
              <div className="space-y-2">
                <textarea
                  value={applePrivateKey}
                  onChange={(e) => setApplePrivateKey(e.target.value)}
                  placeholder="Private Key (PEM format)"
                  rows={4}
                  className="w-full rounded-md border border-border-default bg-surface-input px-3 py-1.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent resize-none font-mono"
                />
                <input
                  type="text"
                  value={appleKeyId}
                  onChange={(e) => setAppleKeyId(e.target.value)}
                  placeholder="Key ID"
                  className="w-full rounded-md border border-border-default bg-surface-input px-3 py-1.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                />
                <input
                  type="text"
                  value={appleIssuerId}
                  onChange={(e) => setAppleIssuerId(e.target.value)}
                  placeholder="Issuer ID"
                  className="w-full rounded-md border border-border-default bg-surface-input px-3 py-1.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={applePodcastId}
                    onChange={(e) => setApplePodcastId(e.target.value)}
                    placeholder="Apple Podcast ID"
                    className="flex-1 rounded-md border border-border-default bg-surface-input px-3 py-1.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                  <button
                    onClick={handleAppleConnect}
                    disabled={!appleCanConnect || connecting}
                    className="rounded-md bg-accent px-4 py-1.5 text-sm font-medium text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
                  >
                    {connecting ? 'Connecting...' : 'Connect'}
                  </button>
                </div>
              </div>
              <button
                onClick={() => {
                  setActiveProvider(null)
                  setApplePrivateKey('')
                  setAppleKeyId('')
                  setAppleIssuerId('')
                  setApplePodcastId('')
                }}
                className="mt-2 rounded-md border border-border-default bg-surface-base px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setActiveProvider('apple')}
              className="flex w-full items-center justify-between rounded-md border border-border-default bg-surface-overlay px-4 py-3 text-left text-sm transition-colors hover:border-accent hover:bg-accent/5"
            >
              <span className="font-medium text-text-primary">Apple Podcasts</span>
              <span className="text-text-secondary">Audience analytics</span>
            </button>
          )
        )}

        {/* Spotify CSV import */}
        {!connectedProviders.has('spotify_csv') && (
          <>
            <input
              ref={csvInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleCsvImport(file)
              }}
            />
            <button
              onClick={() => csvInputRef.current?.click()}
              disabled={importing}
              className="flex w-full items-center justify-between rounded-md border border-border-default bg-surface-overlay px-4 py-3 text-left text-sm transition-colors hover:border-accent hover:bg-accent/5 disabled:opacity-50"
            >
              <span className="font-medium text-text-primary">
                {importing ? 'Importing...' : 'Import Spotify Data'}
              </span>
              <span className="text-text-secondary">CSV import</span>
            </button>
          </>
        )}

        {/* Transistor / Castopod auto-link */}
        {!connectedProviders.has('transistor') && !connectedProviders.has('castopod') && (
          <button
            onClick={handleLinkDistribution}
            disabled={connecting}
            className="flex w-full items-center justify-between rounded-md border border-border-default bg-surface-overlay px-4 py-3 text-left text-sm transition-colors hover:border-accent hover:bg-accent/5 disabled:opacity-50"
          >
            <span className="font-medium text-text-primary">Link Distribution Providers</span>
            <span className="text-text-secondary">Transistor / Castopod</span>
          </button>
        )}
      </div>

      <div className="mt-6 pt-5 border-t border-border-subtle">
        <h3 className="text-xs font-medium uppercase tracking-wider text-text-secondary">
          Download Milestones
        </h3>
        <p className="mt-2 text-sm text-text-secondary">
          Get notified when an episode crosses a download threshold.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {milestones.sort((a, b) => a - b).map((m) => (
            <span key={m} className="inline-flex items-center gap-1.5 rounded-md bg-accent/10 px-2.5 py-1 text-sm text-accent font-medium">
              {m.toLocaleString()}
              <button
                onClick={() => {
                  const updated = milestones.filter((v) => v !== m)
                  setMilestones(updated)
                  saveMilestones(updated)
                }}
                className="text-accent/60 hover:text-accent transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                  <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
                </svg>
              </button>
            </span>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <input
            type="number"
            value={newMilestone}
            onChange={(e) => setNewMilestone(e.target.value)}
            placeholder="e.g. 10000"
            min="1"
            className="flex-1 rounded-md border border-border-default bg-surface-input px-3 py-1.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <button
            onClick={() => {
              const val = parseInt(newMilestone, 10)
              if (!val || val <= 0 || milestones.includes(val)) return
              const updated = [...milestones, val]
              setMilestones(updated)
              setNewMilestone('')
              saveMilestones(updated)
            }}
            disabled={!newMilestone || savingMilestones}
            className="rounded-md bg-accent px-4 py-1.5 text-sm font-medium text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  )
}

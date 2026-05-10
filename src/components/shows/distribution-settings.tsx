'use client'

import { useEffect, useState } from 'react'
import { DISTRIBUTION_PROVIDER_NAMES } from '@/lib/integrations/types'

interface Connection {
  id: string
  provider: string
  external_show_id: string
  external_show_name: string
}

interface SelectionItem {
  id: string
  name: string
}

export function DistributionSettings({ showId }: { showId: string }) {
  const [connections, setConnections] = useState<Connection[]>([])
  const [loading, setLoading] = useState(true)
  const [youtubeConnected, setYoutubeConnected] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [activeProvider, setActiveProvider] = useState<string | null>(null)
  const [showPicker, setShowPicker] = useState<SelectionItem[] | null>(null)
  const [pickerProvider, setPickerProvider] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const [distRes, intRes] = await Promise.all([
          fetch(`/api/v1/shows/${showId}/distribution`),
          fetch('/api/v1/integrations'),
        ])
        if (distRes.ok) {
          const json = await distRes.json()
          const data = json.data
          setConnections(Array.isArray(data) ? data : data ? [data] : [])
        }
        if (intRes.ok) {
          const json = await intRes.json()
          const integrations = json.data || []
          setYoutubeConnected(integrations.some((i: { provider: string }) => i.provider === 'youtube'))
        }
      } catch {
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [showId])

  const connectedProviders = new Set(connections.map((c) => c.provider))

  async function handleTransistorConnect() {
    setError(null)
    setConnecting(true)
    try {
      const res = await fetch(`/api/v1/shows/${showId}/distribution/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'transistor', api_key: apiKey }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to connect')
      if (json.data?.needs_selection) {
        setShowPicker(json.data.shows)
        setPickerProvider('transistor')
      } else {
        setConnections((prev) => [...prev.filter((c) => c.provider !== 'transistor'), json.data])
        setApiKey('')
        setActiveProvider(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect')
    } finally {
      setConnecting(false)
    }
  }

  async function handleYouTubeConnect() {
    setError(null)
    setConnecting(true)
    try {
      const res = await fetch(`/api/v1/shows/${showId}/distribution/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'youtube' }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to connect')
      if (json.data?.needs_selection) {
        setShowPicker(json.data.shows)
        setPickerProvider('youtube')
      } else {
        setConnections((prev) => [...prev.filter((c) => c.provider !== 'youtube'), json.data])
        setActiveProvider(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect')
    } finally {
      setConnecting(false)
    }
  }

  async function handleSelectItem(externalShowId: string) {
    if (!pickerProvider) return
    setError(null)
    setConnecting(true)
    try {
      const body: Record<string, string> = {
        provider: pickerProvider,
        external_show_id: externalShowId,
      }
      if (pickerProvider === 'transistor') body.api_key = apiKey

      const res = await fetch(`/api/v1/shows/${showId}/distribution/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to connect')
      setConnections((prev) => [...prev.filter((c) => c.provider !== pickerProvider), json.data])
      setApiKey('')
      setShowPicker(null)
      setPickerProvider(null)
      setActiveProvider(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect')
    } finally {
      setConnecting(false)
    }
  }

  async function handleDisconnect(provider: string) {
    setError(null)
    try {
      const res = await fetch(`/api/v1/shows/${showId}/distribution?provider=${provider}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Failed to disconnect')
      }
      setConnections((prev) => prev.filter((c) => c.provider !== provider))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect')
    }
  }

  if (loading) return null

  return (
    <div className="rounded-lg border border-border-subtle bg-surface-raised p-5">
      <h3 className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
        Distribution
      </h3>

      {error && (
        <p className="mt-3 text-sm text-red-400">{error}</p>
      )}

      {connections.map((conn) => (
        <div key={conn.id} className="mt-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-text-primary">
              {DISTRIBUTION_PROVIDER_NAMES[conn.provider as keyof typeof DISTRIBUTION_PROVIDER_NAMES] || conn.provider}
            </p>
            <p className="text-sm text-text-secondary">
              {conn.external_show_name}
            </p>
          </div>
          <button
            onClick={() => handleDisconnect(conn.provider)}
            className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 transition-colors"
          >
            Disconnect
          </button>
        </div>
      ))}

      {showPicker && (
        <div className="mt-4">
          <p className="text-sm text-text-secondary mb-3">
            Select {pickerProvider === 'youtube' ? 'a channel' : 'a show'} to connect:
          </p>
          <div className="space-y-2">
            {showPicker.map((item) => (
              <button
                key={item.id}
                onClick={() => handleSelectItem(item.id)}
                disabled={connecting}
                className="block w-full text-left rounded-md border border-border-default bg-surface-overlay px-3 py-2 text-sm text-text-primary hover:bg-surface-input transition-colors disabled:opacity-50"
              >
                {item.name}
              </button>
            ))}
          </div>
          <button
            onClick={() => { setShowPicker(null); setPickerProvider(null); setApiKey('') }}
            className="mt-3 text-sm text-text-tertiary hover:text-text-secondary transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {!showPicker && (
        <div className="mt-4 space-y-3">
          {!connectedProviders.has('transistor') && (
            activeProvider === 'transistor' ? (
              <div>
                <p className="text-sm text-text-secondary mb-3">
                  Connect to Transistor.fm to publish episodes as podcasts.
                </p>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Transistor API key"
                    className="flex-1 rounded-md border border-border-default bg-surface-input px-3 py-1.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                  <button
                    onClick={handleTransistorConnect}
                    disabled={!apiKey.trim() || connecting}
                    className="rounded-md bg-accent px-4 py-1.5 text-sm font-medium text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
                  >
                    {connecting ? 'Connecting...' : 'Connect'}
                  </button>
                </div>
                <button
                  onClick={() => { setActiveProvider(null); setApiKey('') }}
                  className="mt-2 text-sm text-text-tertiary hover:text-text-secondary transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setActiveProvider('transistor')}
                className="flex w-full items-center justify-between rounded-md border border-border-default bg-surface-overlay px-4 py-3 text-left text-sm transition-colors hover:border-accent hover:bg-accent/5"
              >
                <span className="font-medium text-text-primary">Transistor.fm</span>
                <span className="text-text-tertiary">Podcast hosting</span>
              </button>
            )
          )}

          {!connectedProviders.has('youtube') && (
            youtubeConnected ? (
              <button
                onClick={handleYouTubeConnect}
                disabled={connecting}
                className="flex w-full items-center justify-between rounded-md border border-border-default bg-surface-overlay px-4 py-3 text-left text-sm transition-colors hover:border-accent hover:bg-accent/5 disabled:opacity-50"
              >
                <span className="font-medium text-text-primary">YouTube</span>
                <span className="text-text-tertiary">
                  {connecting && activeProvider !== 'transistor' ? 'Connecting...' : 'Video publishing'}
                </span>
              </button>
            ) : (
              <a
                href="/app/settings/developer?connect=youtube"
                className="flex w-full items-center justify-between rounded-md border border-border-default bg-surface-overlay px-4 py-3 text-left text-sm transition-colors hover:border-accent hover:bg-accent/5"
              >
                <span className="font-medium text-text-primary">YouTube</span>
                <span className="text-text-tertiary">Connect account first &rarr;</span>
              </a>
            )
          )}

          {connectedProviders.has('transistor') && connectedProviders.has('youtube') && (
            <p className="text-sm text-text-tertiary">All distribution providers connected.</p>
          )}
        </div>
      )}
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'

interface Connection {
  id: string
  provider: string
  external_show_id: string
  external_show_name: string
}

interface TransistorShow {
  id: string
  name: string
}

export function DistributionSettings({ showId }: { showId: string }) {
  const [connection, setConnection] = useState<Connection | null>(null)
  const [loading, setLoading] = useState(true)
  const [apiKey, setApiKey] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [showPicker, setShowPicker] = useState<TransistorShow[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchConnection() {
      try {
        const res = await fetch(`/api/v1/shows/${showId}/distribution`)
        if (res.ok) {
          const json = await res.json()
          setConnection(json.data)
        }
      } catch {
        // No connection exists
      } finally {
        setLoading(false)
      }
    }
    fetchConnection()
  }, [showId])

  async function handleConnect() {
    setError(null)
    setConnecting(true)
    try {
      const res = await fetch(`/api/v1/shows/${showId}/distribution/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'transistor', api_key: apiKey }),
      })
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error || 'Failed to connect')
      }
      if (json.needs_selection) {
        setShowPicker(json.shows)
      } else {
        setConnection(json.data)
        setApiKey('')
        setShowPicker(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect')
    } finally {
      setConnecting(false)
    }
  }

  async function handleSelectShow(externalShowId: string) {
    setError(null)
    setConnecting(true)
    try {
      const res = await fetch(`/api/v1/shows/${showId}/distribution/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'transistor',
          api_key: apiKey,
          external_show_id: externalShowId,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error || 'Failed to connect')
      }
      setConnection(json.data)
      setApiKey('')
      setShowPicker(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect')
    } finally {
      setConnecting(false)
    }
  }

  async function handleDisconnect() {
    setError(null)
    try {
      const res = await fetch(`/api/v1/shows/${showId}/distribution`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Failed to disconnect')
      }
      setConnection(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect')
    }
  }

  if (loading) {
    return null
  }

  return (
    <div className="rounded-lg border border-border-subtle bg-surface-raised p-5">
      <h3 className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
        Distribution
      </h3>

      {connection ? (
        <div className="mt-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-text-primary">
              Transistor.fm
            </p>
            <p className="text-sm text-text-secondary">
              {connection.external_show_name}
            </p>
          </div>
          <button
            onClick={handleDisconnect}
            className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 transition-colors"
          >
            Disconnect
          </button>
        </div>
      ) : showPicker ? (
        <div className="mt-4">
          <p className="text-sm text-text-secondary mb-3">
            Select a show to connect:
          </p>
          <div className="space-y-2">
            {showPicker.map((show) => (
              <button
                key={show.id}
                onClick={() => handleSelectShow(show.id)}
                disabled={connecting}
                className="block w-full text-left rounded-md border border-border-default bg-surface-overlay px-3 py-2 text-sm text-text-primary hover:bg-surface-input transition-colors disabled:opacity-50"
              >
                {show.name}
              </button>
            ))}
          </div>
          <button
            onClick={() => {
              setShowPicker(null)
              setApiKey('')
            }}
            className="mt-3 text-sm text-text-tertiary hover:text-text-secondary transition-colors"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="mt-4">
          <p className="text-sm text-text-secondary mb-3">
            Connect to Transistor.fm to publish episodes directly from PreRoll.
          </p>
          {error && (
            <p className="text-sm text-red-400 mb-3">{error}</p>
          )}
          <div className="flex gap-2">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Transistor API key"
              className="flex-1 rounded-md border border-border-default bg-surface-input px-3 py-1.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
            <button
              onClick={handleConnect}
              disabled={!apiKey.trim() || connecting}
              className="rounded-md bg-accent px-4 py-1.5 text-sm font-medium text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
            >
              {connecting ? 'Connecting...' : 'Connect'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

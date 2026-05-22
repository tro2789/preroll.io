'use client'

import { useState } from 'react'

interface Props {
  channels: { id: string; name: string }[]
  stateParam: string
}

export function ChannelPicker({ channels, stateParam }: Props) {
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSelect(channelId: string) {
    setConnecting(true)
    setError(null)
    try {
      const res = await fetch('/api/v1/connect/youtube/select-channel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: stateParam, channelId }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to connect channel')
      window.location.href = json.data.redirect
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect')
      setConnecting(false)
    }
  }

  return (
    <div className="mt-6 space-y-2">
      {error && (
        <div className="rounded-md bg-error/5 border border-error/30 px-4 py-3 mb-4">
          <p className="text-sm text-error">{error}</p>
        </div>
      )}
      {channels.map((ch) => (
        <button
          key={ch.id}
          onClick={() => handleSelect(ch.id)}
          disabled={connecting}
          className="block w-full text-left rounded-md border border-border-default bg-surface-overlay px-4 py-3 text-sm text-text-primary hover:border-accent hover:bg-accent/5 transition-colors disabled:opacity-50"
        >
          {ch.name}
        </button>
      ))}
    </div>
  )
}

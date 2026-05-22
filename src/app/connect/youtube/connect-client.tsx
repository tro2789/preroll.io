'use client'

import { useState } from 'react'

export function YouTubeConnectClient({ token }: { token: string }) {
  const [loading, setLoading] = useState(false)

  async function handleConnect() {
    setLoading(true)
    try {
      const res = await fetch(`/api/v1/connect/youtube/auth-url?token=${encodeURIComponent(token)}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to start connection')
      window.location.href = json.data.url
    } catch {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleConnect}
      disabled={loading}
      className="mt-6 w-full rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
    >
      {loading ? 'Connecting...' : 'Connect with Google'}
    </button>
  )
}

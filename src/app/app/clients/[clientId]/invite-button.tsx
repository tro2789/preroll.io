'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface InviteButtonProps {
  clientId: string
  inviteCode: string | null
  clientUserId: string | null
  onboardedAt: string | null
}

export function InviteButton({ clientId, inviteCode, clientUserId, onboardedAt }: InviteButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  if (clientUserId && onboardedAt) {
    return (
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
          Portal active
        </span>
      </div>
    )
  }

  if (clientUserId && !onboardedAt) {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-400">
        Invited (pending onboarding)
      </span>
    )
  }

  if (inviteCode && !generatedUrl) {
    const url = `${window.location.origin}/invite/${inviteCode}`
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-text-tertiary">Invite sent</span>
        <button
          onClick={() => { navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
          className="text-xs text-accent hover:text-accent-hover transition-colors"
        >
          {copied ? 'Copied!' : 'Copy link'}
        </button>
      </div>
    )
  }

  if (generatedUrl) {
    return (
      <div className="flex items-center gap-2">
        <input
          type="text"
          readOnly
          value={generatedUrl}
          className="rounded-md border border-border-default bg-surface-input px-2 py-1 text-xs text-text-primary w-64 focus:outline-none"
        />
        <button
          onClick={() => { navigator.clipboard.writeText(generatedUrl); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
          className="rounded-md bg-accent px-2.5 py-1 text-xs font-medium text-white hover:bg-accent-hover transition-colors"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
    )
  }

  async function handleInvite() {
    setLoading(true)
    const res = await fetch('/api/v1/invites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId }),
    })

    const json = await res.json()
    if (res.ok) {
      setGeneratedUrl(`${window.location.origin}${json.data.invite_url}`)
    }
    setLoading(false)
    router.refresh()
  }

  return (
    <button
      onClick={handleInvite}
      disabled={loading}
      className="inline-flex items-center rounded-md bg-surface-overlay px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface-overlay/80 disabled:opacity-50"
    >
      {loading ? 'Generating...' : 'Invite to Portal'}
    </button>
  )
}

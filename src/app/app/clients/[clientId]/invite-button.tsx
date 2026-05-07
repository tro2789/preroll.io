'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface InviteButtonProps {
  clientId: string
  clientEmail: string | null
  inviteCode: string | null
  clientUserId: string | null
  onboardedAt: string | null
}

export function InviteButton({ clientId, clientEmail, inviteCode, clientUserId, onboardedAt }: InviteButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (clientUserId && onboardedAt) {
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
        Portal active
      </span>
    )
  }

  if (clientUserId && !onboardedAt) {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-400">
        Invited (pending onboarding)
      </span>
    )
  }

  if (sent) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
        </svg>
        Invite sent to {clientEmail}
      </span>
    )
  }

  async function handleInvite() {
    setLoading(true)
    setError(null)
    const res = await fetch('/api/v1/invites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId }),
    })

    const json = await res.json()
    if (res.ok) {
      setSent(true)
    } else {
      setError(json.error || 'Failed to send invite')
    }
    setLoading(false)
    router.refresh()
  }

  const alreadySent = !!inviteCode

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleInvite}
        disabled={loading || !clientEmail}
        className="inline-flex items-center rounded-md bg-surface-overlay px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface-overlay/80 disabled:opacity-50"
      >
        {loading ? 'Sending...' : alreadySent ? 'Resend Invite' : 'Invite to Portal'}
      </button>
      {!clientEmail && (
        <span className="text-xs text-text-tertiary">Add an email address first</span>
      )}
      {alreadySent && !sent && (
        <span className="text-xs text-text-tertiary">Invite previously sent</span>
      )}
      {error && (
        <span className="text-xs text-error">{error}</span>
      )}
    </div>
  )
}

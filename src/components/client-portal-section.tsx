'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

export interface PortalClient {
  id: string
  name: string
  email: string | null
  invite_code: string | null
  client_user_id: string | null
  onboarded_at: string | null
}

interface ClientPortalSectionProps {
  clientId: string
  clientName: string
  clientEmail: string | null
  inviteCode: string | null
  onboardedAt: string | null
}

export function ClientPortalSection({
  clientId,
  clientName,
  clientEmail,
  inviteCode: initialInviteCode,
  onboardedAt,
}: ClientPortalSectionProps) {
  const router = useRouter()
  const [inviteCode, setInviteCode] = useState(initialInviteCode)
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fetchingRef = useRef(false)

  useEffect(() => {
    if (onboardedAt || inviteCode || fetchingRef.current) return
    fetchingRef.current = true
    setGenerating(true)
    fetch('/api/v1/invites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId, generate_only: true }),
    })
      .then((r) => r.json())
      .then((json) => {
        if (json.data?.invite_code) setInviteCode(json.data.invite_code)
      })
      .finally(() => {
        setGenerating(false)
        fetchingRef.current = false
      })
  }, [clientId, onboardedAt, inviteCode])

  function getInviteUrl() {
    if (!inviteCode) return ''
    return `${window.location.origin}/invite/${inviteCode}`
  }

  function handleCopy() {
    navigator.clipboard.writeText(getInviteUrl())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleSendEmail() {
    if (!clientEmail) return
    setSending(true)
    setError(null)
    setSent(false)
    const res = await fetch('/api/v1/invites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId }),
    })
    const json = await res.json()
    if (res.ok) {
      setSent(true)
      if (json.data?.invite_code) setInviteCode(json.data.invite_code)
      router.refresh()
    } else {
      setError(json.error || 'Failed to send')
    }
    setSending(false)
  }

  if (onboardedAt) {
    return (
      <div className="rounded-lg border border-border-subtle bg-surface-raised p-4">
        <h3 className="text-[11px] text-text-tertiary uppercase tracking-wider mb-3">Client Portal</h3>
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-sm text-emerald-400">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
            {clientName} has access
          </span>
          <a
            href={`/portal?preview=${clientId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-text-tertiary hover:text-accent transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
            View as client
          </a>
        </div>
      </div>
    )
  }

  const isPending = !!inviteCode

  return (
    <div className="rounded-lg border border-border-subtle bg-surface-raised p-4">
      <h3 className="text-[11px] text-text-tertiary uppercase tracking-wider mb-1.5">Client Portal</h3>

      {isPending ? (
        <div className="mb-3">
          <span className="inline-flex items-center rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-400">
            Invited &middot; Pending setup
          </span>
        </div>
      ) : (
        <p className="text-xs text-text-tertiary mb-3">
          Give {clientName} access to review deliverables and approve episodes
        </p>
      )}

      {inviteCode ? (
        <div className="flex items-center gap-1.5">
          <div className="flex-1 min-w-0 rounded-md border border-border-subtle bg-surface-input px-2.5 py-1.5 text-xs text-text-secondary truncate select-all">
            {getInviteUrl()}
          </div>
          <button
            onClick={handleCopy}
            className="shrink-0 rounded-md border border-border-subtle bg-surface-overlay px-2.5 py-1.5 text-xs font-medium text-text-primary hover:border-border-hover transition-colors"
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 h-8">
          <div className="w-3.5 h-3.5 border-2 border-text-tertiary/30 border-t-text-tertiary rounded-full animate-spin" />
          <span className="text-xs text-text-tertiary">Generating link...</span>
        </div>
      )}

      <div className="mt-2.5 flex items-center gap-3">
        <button
          onClick={handleSendEmail}
          disabled={!clientEmail || sending}
          className="text-xs text-text-tertiary hover:text-accent transition-colors disabled:opacity-40 disabled:hover:text-text-tertiary"
        >
          {sending ? 'Sending...' : sent ? 'Email sent' : isPending ? 'Resend email' : 'Send via email'}
        </button>
        {!clientEmail && (
          <span className="text-xs text-text-tertiary/60">No email set</span>
        )}
        {error && <span className="text-xs text-error">{error}</span>}
      </div>
    </div>
  )
}

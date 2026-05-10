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
  const [copied, setCopied] = useState(false)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fetchingRef = useRef(false)
  const [sendingLogin, setSendingLogin] = useState(false)
  const [loginSent, setLoginSent] = useState(false)

  useEffect(() => {
    if (onboardedAt || inviteCode || fetchingRef.current) return
    fetchingRef.current = true
    fetch('/api/v1/invites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId, generate_only: true }),
    })
      .then((r) => r.json())
      .then((json) => {
        if (json.data?.invite_code) setInviteCode(json.data.invite_code)
      })
      .finally(() => { fetchingRef.current = false })
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

  async function handleSendLoginLink() {
    if (!clientEmail) return
    setSendingLogin(true)
    setError(null)
    setLoginSent(false)
    try {
      const res = await fetch('/api/v1/portal/send-login-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId }),
      })
      if (res.ok) {
        setLoginSent(true)
      } else {
        const json = await res.json()
        setError(json.error || 'Failed to send')
      }
    } catch {
      setError('Failed to send')
    } finally {
      setSendingLogin(false)
    }
  }

  const btnSecondary = 'w-full rounded-md border border-border-default bg-surface-overlay px-3 py-2 text-xs font-medium text-text-primary hover:bg-surface-input transition-colors disabled:opacity-40'

  if (onboardedAt) {
    return (
      <div className="rounded-lg border border-border-subtle bg-surface-raised p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[11px] text-text-tertiary uppercase tracking-wider">Client Portal</h3>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Active
          </span>
        </div>

        <div className="space-y-2">
          <button
            onClick={handleSendLoginLink}
            disabled={!clientEmail || sendingLogin}
            className={btnSecondary}
          >
            {sendingLogin ? 'Sending...' : loginSent ? 'Login link sent' : 'Send login link'}
          </button>

          <a
            href={`/portal?preview=${clientId}`}
            target="_blank"
            rel="noopener noreferrer"
            className={btnSecondary + ' inline-flex items-center justify-center gap-1.5'}
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
            Preview portal
          </a>
        </div>

        {!clientEmail && (
          <p className="mt-3 text-xs text-text-tertiary">Add an email to send login links.</p>
        )}

        {error && (
          <div className="mt-3 rounded-md bg-error/10 border border-error/30 px-3 py-2 text-xs text-error">{error}</div>
        )}
      </div>
    )
  }

  const isPending = !!inviteCode

  return (
    <div className="rounded-lg border border-border-subtle bg-surface-raised p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[11px] text-text-tertiary uppercase tracking-wider">Client Portal</h3>
        {isPending && (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-400">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            Pending
          </span>
        )}
      </div>

      {!isPending && (
        <p className="text-xs text-text-secondary mb-4 leading-relaxed">
          Give {clientName} access to review deliverables and track episode progress.
        </p>
      )}

      {inviteCode ? (
        <div className="space-y-3">
          <div className="flex items-center gap-1.5">
            <div className="flex-1 min-w-0 rounded-md border border-border-subtle bg-surface-input px-2.5 py-2 text-xs text-text-secondary truncate select-all font-mono">
              {getInviteUrl()}
            </div>
            <button
              onClick={handleCopy}
              className="shrink-0 rounded-md border border-border-default bg-surface-overlay px-3 py-2 text-xs font-medium text-text-primary hover:bg-surface-input transition-colors"
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>

          <button
            onClick={handleSendEmail}
            disabled={!clientEmail || sending}
            className={btnSecondary}
          >
            {sending ? 'Sending...' : sent ? 'Invite email sent' : isPending ? 'Resend invite email' : 'Send invite email'}
          </button>

          {!clientEmail && (
            <p className="text-xs text-text-tertiary">Add an email to send invites.</p>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2 py-1">
          <div className="w-3.5 h-3.5 border-2 border-text-tertiary/30 border-t-text-tertiary rounded-full animate-spin" />
          <span className="text-xs text-text-tertiary">Generating invite link...</span>
        </div>
      )}

      {error && (
        <div className="mt-3 rounded-md bg-error/10 border border-error/30 px-3 py-2 text-xs text-error">{error}</div>
      )}
    </div>
  )
}

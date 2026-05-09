'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

function JoinContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [phase, setPhase] = useState<'checking' | 'needsAuth' | 'joining' | 'joined' | 'error'>('checking')
  const [orgName, setOrgName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [settingPassword, setSettingPassword] = useState(false)
  const [passwordSet, setPasswordSet] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  const [magicLinkSent, setMagicLinkSent] = useState(false)
  const [sendingLink, setSendingLink] = useState(false)

  useEffect(() => {
    if (!token) {
      setError('No invite token provided.')
      setPhase('error')
      return
    }

    async function tryJoin() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setPhase('needsAuth')
        return
      }

      try {
        const res = await fetch('/api/v1/team/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        })
        const json = await res.json()
        if (!res.ok) {
          throw new Error(json.error || 'Failed to join team')
        }
        setOrgName(json.data?.organization?.name || 'the team')
        setPhase('joined')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
        setPhase('error')
      }
    }
    tryJoin()
  }, [token])

  async function handleSendLink() {
    setSendingLink(true)
    try {
      const res = await fetch('/api/v1/team/join/send-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      if (res.ok) {
        setMagicLinkSent(true)
      } else {
        const json = await res.json()
        setError(json.error || 'Failed to send login link')
        setPhase('error')
      }
    } catch {
      setError('Failed to send login link')
      setPhase('error')
    } finally {
      setSendingLink(false)
    }
  }

  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault()
    setPasswordError(null)
    if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match.')
      return
    }
    setSettingPassword(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setPasswordError(error.message)
      setSettingPassword(false)
      return
    }
    setPasswordSet(true)
    setSettingPassword(false)
  }

  if (phase === 'checking') {
    return <p className="text-text-secondary">Loading...</p>
  }

  if (phase === 'needsAuth') {
    if (magicLinkSent) {
      return (
        <div className="w-full max-w-sm text-center space-y-4">
          <h1 className="text-2xl font-bold tracking-widest uppercase text-text-primary">PreRoll</h1>
          <div className="rounded-lg bg-surface-raised p-6 border border-border-subtle space-y-3">
            <p className="text-sm font-medium text-text-primary">Check your email</p>
            <p className="text-sm text-text-secondary">
              We sent a sign-in link. Click it to join the team.
            </p>
          </div>
        </div>
      )
    }

    return (
      <div className="w-full max-w-sm text-center space-y-4">
        <h1 className="text-2xl font-bold tracking-widest uppercase text-text-primary">PreRoll</h1>
        <div className="rounded-lg bg-surface-raised p-6 border border-border-subtle space-y-3">
          <p className="text-sm font-medium text-text-primary">Sign in to accept this invite</p>
          <p className="text-sm text-text-secondary">
            We&apos;ll send a login link to the email this invite was sent to.
          </p>
          <button
            onClick={handleSendLink}
            disabled={sendingLink}
            className="w-full rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
          >
            {sendingLink ? 'Sending...' : 'Send me a sign-in link'}
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'error') {
    return (
      <div className="w-full max-w-sm text-center space-y-4">
        <h1 className="text-2xl font-bold tracking-widest uppercase text-text-primary">PreRoll</h1>
        <div className="rounded-md bg-error/10 border border-error/30 px-3 py-2.5 text-sm text-error">
          {error}
        </div>
        <Link
          href="/login"
          className="inline-block text-sm text-accent hover:text-accent-hover transition-colors"
        >
          Go to login
        </Link>
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm text-center space-y-4">
      <h1 className="text-2xl font-bold tracking-widest uppercase text-text-primary">PreRoll</h1>
      <div className="rounded-lg bg-surface-raised p-6 border border-border-subtle space-y-3">
        <svg className="mx-auto h-10 w-10 text-success" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
        </svg>
        <p className="text-lg font-semibold text-text-primary">
          You&apos;ve joined {orgName}!
        </p>
        <p className="text-sm text-text-secondary">
          You now have access to the organization&apos;s shows, episodes, and workflows.
        </p>
      </div>

      {!passwordSet ? (
        <form onSubmit={handleSetPassword} className="rounded-lg bg-surface-raised p-6 border border-border-subtle space-y-4 text-left">
          <p className="text-sm font-medium text-text-primary">Set a password to continue</p>
          <p className="text-xs text-text-tertiary">You&apos;ll use this to sign in next time.</p>
          {passwordError && (
            <div className="rounded-md bg-error/10 border border-error/30 px-3 py-2 text-sm text-error">
              {passwordError}
            </div>
          )}
          <div>
            <label htmlFor="password" className="block text-xs font-medium text-text-tertiary mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="block w-full rounded-md border border-border-default bg-surface-input px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
              placeholder="At least 8 characters"
            />
          </div>
          <div>
            <label htmlFor="confirm-password" className="block text-xs font-medium text-text-tertiary mb-1">
              Confirm password
            </label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="block w-full rounded-md border border-border-default bg-surface-input px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
              placeholder="Confirm your password"
            />
          </div>
          <button
            type="submit"
            disabled={settingPassword}
            className="w-full rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
          >
            {settingPassword ? 'Setting password...' : 'Set Password & Continue'}
          </button>
        </form>
      ) : (
        <Link
          href="/app"
          className="inline-block w-full rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover transition-colors"
        >
          Go to Dashboard
        </Link>
      )}
    </div>
  )
}

export default function TeamJoinPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-base px-4">
      <Suspense fallback={<p className="text-text-secondary">Loading...</p>}>
        <JoinContent />
      </Suspense>
    </div>
  )
}

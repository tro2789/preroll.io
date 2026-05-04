'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function InvitePage() {
  const params = useParams()
  const code = params.code as string
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showName, setShowName] = useState<string | null>(null)
  const [validating, setValidating] = useState(true)

  useEffect(() => {
    async function validateInvite() {
      const supabase = createClient()
      const { data } = await supabase
        .from('clients')
        .select('name, shows(name)')
        .eq('invite_code', code)
        .single()

      if (!data) {
        setError('This invite link is invalid or has expired.')
      } else {
        const shows = data.shows as { name: string }[]
        setShowName(shows?.[0]?.name || data.name)
      }
      setValidating(false)
    }
    validateInvite()
  }, [code])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/portal/onboarding?invite=${code}`,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  if (validating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-base">
        <p className="text-text-secondary">Validating invite...</p>
      </div>
    )
  }

  if (error && !showName) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-base px-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <h1 className="text-2xl font-bold tracking-widest uppercase text-text-primary">PreRoll</h1>
          <div className="rounded-md bg-error/10 border border-error/30 px-3 py-2.5 text-sm text-error">
            {error}
          </div>
        </div>
      </div>
    )
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-base px-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <h1 className="text-2xl font-bold tracking-widest uppercase text-text-primary">PreRoll</h1>
          <div className="rounded-lg bg-surface-raised p-6 border border-border-subtle space-y-3">
            <p className="text-text-primary font-medium">Check your email</p>
            <p className="text-sm text-text-secondary">
              We sent a login link to <strong>{email}</strong>. Click it to access your portal.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-base px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-widest uppercase text-text-primary">PreRoll</h1>
          <p className="mt-3 text-sm text-text-secondary">
            You&apos;ve been invited to view <strong className="text-text-primary">{showName}</strong>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="rounded-md bg-error/10 border border-error/30 px-3 py-2.5 text-sm text-error">
              {error}
            </div>
          )}

          <div className="rounded-lg bg-surface-raised p-6 space-y-4 border border-border-subtle">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-text-secondary mb-1.5">
                Your email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="block w-full rounded-md border border-border-default bg-surface-input px-3 py-2 text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Sending...' : 'Send me a login link'}
          </button>
        </form>
      </div>
    </div>
  )
}

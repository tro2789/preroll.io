'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { PrerollLogo } from '@/components/ui/preroll-logo'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/confirm`,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-base px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center flex flex-col items-center">
          <PrerollLogo size={48} className="text-text-primary" />
          <p className="mt-3 text-sm text-text-secondary">
            Reset your password
          </p>
        </div>

        {sent ? (
          <div className="rounded-lg bg-surface-raised p-6 border border-border-subtle text-center space-y-3">
            <p className="text-sm text-text-primary">
              Check your email for a password reset link.
            </p>
            <Link href="/login" className="text-sm text-accent hover:text-accent-hover transition-colors">
              Back to login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-md bg-error/10 border border-error/30 px-3 py-2.5 text-sm text-error">
                {error}
              </div>
            )}

            <div className="rounded-lg bg-surface-raised p-6 space-y-4 border border-border-subtle">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-text-secondary mb-1.5">
                  Email
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
              {loading ? 'Sending...' : 'Send reset link'}
            </button>
          </form>
        )}

        <p className="text-center text-sm text-text-tertiary">
          <Link href="/login" className="text-accent hover:text-accent-hover transition-colors">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  )
}

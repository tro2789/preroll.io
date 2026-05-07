'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-surface-base">
        <p className="text-text-secondary">Loading...</p>
      </div>
    }>
      <OnboardingContent />
    </Suspense>
  )
}

function OnboardingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const inviteCode = searchParams.get('invite')
  const [company, setCompany] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [accepting, setAccepting] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [clientId, setClientId] = useState<string | null>(null)

  useEffect(() => {
    async function acceptInvite() {
      if (!inviteCode) {
        router.push('/portal')
        return
      }

      const res = await fetch('/api/v1/invites/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invite_code: inviteCode }),
      })

      const json = await res.json()
      if (!res.ok) {
        setError(json.error || 'Failed to accept invite')
        setAccepting(false)
        return
      }

      setClientId(json.data.id)
      setCompany(json.data.company || '')
      setPhone(json.data.phone || '')
      setAccepting(false)
    }
    acceptInvite()
  }, [inviteCode, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!clientId) return
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: updateError } = await supabase
      .from('clients')
      .update({ company: company || null, phone: phone || null })
      .eq('id', clientId)

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    router.push('/portal')
  }

  if (accepting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-base">
        <p className="text-text-secondary">Setting up your account...</p>
      </div>
    )
  }

  if (error && !clientId) {
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-base px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-widest uppercase text-text-primary">PreRoll</h1>
          <p className="mt-3 text-sm text-text-secondary">
            Welcome! Let&apos;s get your profile set up.
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
              <label htmlFor="company" className="block text-sm font-medium text-text-secondary mb-1.5">
                Company name
              </label>
              <input
                id="company"
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="block w-full rounded-md border border-border-default bg-surface-input px-3 py-2 text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
                placeholder="Your company"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-text-secondary mb-1.5">
                Phone number
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="block w-full rounded-md border border-border-default bg-surface-input px-3 py-2 text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
                placeholder="(555) 123-4567"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Saving...' : 'Continue to portal'}
          </button>
        </form>
      </div>
    </div>
  )
}

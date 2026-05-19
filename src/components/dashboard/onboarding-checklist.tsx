'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { QuickCreate } from '@/components/dashboard/quick-create'

interface OnboardingData {
  dismissed: boolean
  steps: {
    client_created: boolean
    show_created: boolean
    episode_created: boolean
    episode_moved: boolean
  }
  sample_client_exists: boolean
}

export function OnboardingChecklist() {
  const router = useRouter()
  const [data, setData] = useState<OnboardingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dismissed, setDismissed] = useState(false)
  const [removingSample, setRemovingSample] = useState(false)
  const autoDismissedRef = useRef(false)

  useEffect(() => {
    fetch('/api/v1/onboarding')
      .then((r) => r.json())
      .then((json) => {
        const d = json.data as OnboardingData | undefined
        if (d) {
          setData(d)
          if (d.dismissed) setDismissed(true)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const refetch = () => {
      fetch('/api/v1/onboarding')
        .then((r) => r.json())
        .then((json) => {
          const d = json.data as OnboardingData | undefined
          if (d) setData(d)
        })
        .catch(() => {})
    }
    const events = [
      'preroll:episode-moved',
      'preroll:client-created',
      'preroll:show-created',
      'preroll:episode-created',
    ]
    events.forEach((e) => window.addEventListener(e, refetch))
    return () => events.forEach((e) => window.removeEventListener(e, refetch))
  }, [])

  useEffect(() => {
    if (!data || dismissed || autoDismissedRef.current) return
    if (data.steps.episode_created) {
      autoDismissedRef.current = true
      fetch('/api/v1/onboarding/dismiss', { method: 'POST' })
        .then(() => { setDismissed(true); router.refresh() })
        .catch(() => { autoDismissedRef.current = false })
    }
  }, [data, dismissed, router])

  if (loading || dismissed || !data) return null

  async function handleDismiss() {
    try {
      await fetch('/api/v1/onboarding/dismiss', { method: 'POST' })
      setDismissed(true)
      router.refresh()
    } catch {
      // silent
    }
  }

  async function handleRemoveSample() {
    setRemovingSample(true)
    try {
      const res = await fetch('/api/v1/onboarding/sample-data', { method: 'DELETE' })
      if (res.ok) {
        setData((prev) => prev ? { ...prev, sample_client_exists: false } : prev)
        router.refresh()
      }
    } catch {
      // silent
    } finally {
      setRemovingSample(false)
    }
  }

  return (
    <div className="rounded-xl border border-border-subtle bg-surface-raised">
      <div className="flex items-start justify-between px-5 pt-5 pb-4">
        <div className="space-y-2 pr-4">
          <h2 className="text-sm font-semibold text-text-primary">Welcome to PreRoll</h2>
          <p className="text-sm text-text-secondary leading-relaxed">
            Create a client, add a show, and start an episode — all in one step. Use the button below or the <strong>+ New</strong> button in the top bar anytime.
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="shrink-0 mt-0.5 text-text-tertiary hover:text-text-primary transition-colors"
          aria-label="Dismiss welcome card"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10.5 3.5L3.5 10.5M3.5 3.5L10.5 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="px-5 pb-5">
        <QuickCreate
          buttonLabel="Create Your First Project"
          buttonClassName="rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover transition-colors"
        />
      </div>

      {data.sample_client_exists && (
        <div className="border-t border-border-subtle px-5 py-3">
          <button
            onClick={handleRemoveSample}
            disabled={removingSample}
            className="text-xs text-text-tertiary hover:text-text-secondary transition-colors disabled:opacity-50"
          >
            {removingSample ? 'Removing...' : 'Remove sample data'}
          </button>
        </div>
      )}
    </div>
  )
}

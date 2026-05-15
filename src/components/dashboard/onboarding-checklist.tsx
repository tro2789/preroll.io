'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { OnboardingSkeleton } from '@/components/onboarding/onboarding-skeleton'

interface OnboardingData {
  dismissed: boolean
  steps: {
    client_created: boolean
    show_created: boolean
    episode_created: boolean
    episode_moved: boolean
  }
  sample_client_exists: boolean
  links: {
    create_client: string
    add_show: string
    create_episode: string
    move_episode: string
  }
}

const STEPS = [
  { key: 'client_created', label: 'Create a client', linkKey: 'create_client' },
  { key: 'show_created', label: 'Add a show', linkKey: 'add_show' },
  { key: 'episode_created', label: 'Create an episode', linkKey: 'create_episode' },
  { key: 'episode_moved', label: 'Move an episode through the pipeline', linkKey: 'move_episode' },
] as const satisfies readonly { key: keyof OnboardingData['steps']; label: string; linkKey: keyof OnboardingData['links'] }[]

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
    const allComplete = STEPS.every((s) => data.steps[s.key])
    if (allComplete) {
      autoDismissedRef.current = true
      fetch('/api/v1/onboarding/dismiss', { method: 'POST' })
        .then(() => { setDismissed(true); router.refresh() })
        .catch(() => { autoDismissedRef.current = false })
    }
  }, [data, dismissed, router])

  if (loading) return <OnboardingSkeleton />
  if (dismissed || !data) return null

  const completedCount = STEPS.filter((s) => data.steps[s.key]).length
  const progressPct = (completedCount / STEPS.length) * 100
  const nextStepIndex = STEPS.findIndex((s) => !data.steps[s.key])

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
      <div className="flex items-center justify-between px-5 pt-4 pb-3">
        <h2 className="text-sm font-semibold text-text-primary">Getting Started</h2>
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-text-tertiary">
            {completedCount} of {STEPS.length}
          </span>
          <button
            onClick={handleDismiss}
            className="text-text-tertiary hover:text-text-primary transition-colors"
            aria-label="Dismiss onboarding checklist"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10.5 3.5L3.5 10.5M3.5 3.5L10.5 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      <div className="mx-5 mb-4 h-1.5 rounded-full bg-surface-overlay">
        <div
          className="h-full rounded-full bg-accent transition-all duration-500"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <div className="px-5 pb-4 space-y-1">
        {STEPS.map((step, index) => {
          const completed = data.steps[step.key]
          const isNext = index === nextStepIndex
          const href = data.links[step.linkKey]

          if (completed) {
            return (
              <div key={step.key} className="flex items-center gap-3 py-1.5">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0 text-success">
                  <circle cx="9" cy="9" r="8" fill="currentColor" fillOpacity="0.15" />
                  <path d="M5.5 9.5L7.5 11.5L12.5 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="text-sm text-text-tertiary line-through">{step.label}</span>
              </div>
            )
          }

          if (isNext) {
            return (
              <Link key={step.key} href={href} className="flex items-center gap-3 py-1.5 group">
                <div className="shrink-0 w-[18px] h-[18px] rounded-full border-2 border-accent" />
                <span className="text-sm font-medium text-accent group-hover:text-accent-hover transition-colors">
                  {step.label}
                  <span className="ml-1.5 inline-block transition-transform group-hover:translate-x-0.5">&rarr;</span>
                </span>
              </Link>
            )
          }

          return (
            <div key={step.key} className="flex items-center gap-3 py-1.5">
              <div className="shrink-0 w-[18px] h-[18px] rounded-full border-2 border-border-subtle" />
              <span className="text-sm text-text-tertiary">{step.label}</span>
            </div>
          )
        })}
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

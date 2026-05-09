'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

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

const STEP_KEYS = [
  'client_created',
  'show_created',
  'episode_created',
  'episode_moved',
] as const

const STEP_LABELS: Record<(typeof STEP_KEYS)[number], string> = {
  client_created: 'Create a client',
  show_created: 'Add a show',
  episode_created: 'Create an episode',
  episode_moved: 'Move an episode through the pipeline',
}

const STEP_LINK_KEYS: Record<(typeof STEP_KEYS)[number], keyof OnboardingData['links']> = {
  client_created: 'create_client',
  show_created: 'add_show',
  episode_created: 'create_episode',
  episode_moved: 'move_episode',
}

export function OnboardingChecklist() {
  const router = useRouter()
  const [data, setData] = useState<OnboardingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dismissed, setDismissed] = useState(false)
  const [removingSample, setRemovingSample] = useState(false)

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

  // Auto-dismiss when all steps complete
  useEffect(() => {
    if (!data || dismissed) return
    const allComplete = STEP_KEYS.every((k) => data.steps[k])
    if (allComplete) {
      fetch('/api/v1/onboarding/dismiss', { method: 'POST' })
        .then(() => {
          setDismissed(true)
          router.refresh()
        })
        .catch(() => {})
    }
  }, [data, dismissed, router])

  if (loading || dismissed || !data) return null

  const completedCount = STEP_KEYS.filter((k) => data.steps[k]).length
  const totalSteps = STEP_KEYS.length
  const progressPct = (completedCount / totalSteps) * 100

  // Find the index of the first incomplete step
  const nextStepIndex = STEP_KEYS.findIndex((k) => !data.steps[k])

  async function handleDismiss() {
    setDismissed(true)
    await fetch('/api/v1/onboarding/dismiss', { method: 'POST' }).catch(() => {})
    router.refresh()
  }

  async function handleRemoveSample() {
    setRemovingSample(true)
    try {
      const res = await fetch('/api/v1/onboarding/sample-data', { method: 'DELETE' })
      if (res.ok) {
        setData((prev) =>
          prev ? { ...prev, sample_client_exists: false } : prev
        )
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
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3">
        <h2 className="text-sm font-semibold text-text-primary">Getting Started</h2>
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-text-tertiary">
            {completedCount} of {totalSteps}
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

      {/* Progress bar */}
      <div className="mx-5 mb-4 h-1.5 rounded-full bg-surface-overlay">
        <div
          className="h-full rounded-full bg-accent transition-all duration-500"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Steps */}
      <div className="px-5 pb-4 space-y-1">
        {STEP_KEYS.map((key, index) => {
          const completed = data.steps[key]
          const isNext = index === nextStepIndex
          const label = STEP_LABELS[key]
          const href = data.links[STEP_LINK_KEYS[key]]

          if (completed) {
            return (
              <div key={key} className="flex items-center gap-3 py-1.5">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0 text-success">
                  <circle cx="9" cy="9" r="8" fill="currentColor" fillOpacity="0.15" />
                  <path d="M5.5 9.5L7.5 11.5L12.5 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="text-sm text-text-tertiary line-through">{label}</span>
              </div>
            )
          }

          if (isNext) {
            return (
              <Link
                key={key}
                href={href}
                className="flex items-center gap-3 py-1.5 group"
              >
                <div className="shrink-0 w-[18px] h-[18px] rounded-full border-2 border-accent" />
                <span className="text-sm font-medium text-accent group-hover:text-accent-hover transition-colors">
                  {label}
                  <span className="ml-1.5 inline-block transition-transform group-hover:translate-x-0.5">&rarr;</span>
                </span>
              </Link>
            )
          }

          // Future step
          return (
            <div key={key} className="flex items-center gap-3 py-1.5">
              <div className="shrink-0 w-[18px] h-[18px] rounded-full border-2 border-border-subtle" />
              <span className="text-sm text-text-tertiary">{label}</span>
            </div>
          )
        })}
      </div>

      {/* Remove sample data */}
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

'use client'

import { useState, useEffect, useCallback } from 'react'

const DISMISS_KEY = 'preroll:drag-coachmark-dismissed'

interface DragCoachmarkProps {
  visible: boolean
  onDismiss: () => void
}

export function DragCoachmark({ visible, onDismiss }: DragCoachmarkProps) {
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY) === 'true') {
      setDismissed(true)
    }
  }, [])

  const dismiss = useCallback(() => {
    setDismissed(true)
    localStorage.setItem(DISMISS_KEY, 'true')
    onDismiss()
  }, [onDismiss])

  useEffect(() => {
    window.addEventListener('preroll:episode-moved', dismiss)
    return () => window.removeEventListener('preroll:episode-moved', dismiss)
  }, [dismiss])

  if (!visible || dismissed) return null

  return (
    <div className="mb-3 flex items-center gap-2.5 rounded-lg border border-accent/20 bg-accent/5 px-4 py-2.5">
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        className="shrink-0 text-accent"
        aria-hidden="true"
      >
        <path
          d="M6 3L6 13M10 3L10 13M3 6H13M3 10H13"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
      <span className="text-xs font-medium text-accent">
        Drag an episode card to a new column to advance it through the pipeline
      </span>
      <button
        onClick={dismiss}
        className="ml-auto shrink-0 text-text-tertiary hover:text-text-secondary transition-colors"
        aria-label="Dismiss drag hint"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path
            d="M9 3L3 9M3 3L9 9"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  )
}

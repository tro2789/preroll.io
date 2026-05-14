'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

interface Activity {
  id: string
  action: string
  description: string
  created_at: string
  show_id: string
  episode_id: string | null
  metadata: Record<string, unknown> | null
  shows: { name: string } | null
}

const ACTION_DOTS: Record<string, string> = {
  episode_stage_changed: 'bg-blue-400',
  episode_submitted: 'bg-accent',
  deliverable_submitted: 'bg-amber-400',
  deliverable_approved: 'bg-emerald-400',
  deliverable_revision_requested: 'bg-red-400',
  deliverable_resubmitted: 'bg-amber-400',
  episode_published: 'bg-emerald-400',
  file_uploaded: 'bg-sky-400',
  transcription_completed: 'bg-violet-400',
  ai_generation_completed: 'bg-violet-400',
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function NotificationDropdown() {
  const [open, setOpen] = useState(false)
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(false)
  const [lastChecked, setLastChecked] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  const unreadCount = lastChecked
    ? activities.filter(a => a.created_at > lastChecked).length
    : activities.length

  useEffect(() => {
    const stored = localStorage.getItem('preroll:notifications:lastChecked')
    if (stored) setLastChecked(stored)

    setLoading(true)
    fetch('/api/v1/dashboard')
      .then(r => r.json())
      .then(json => {
        const raw = json.data?.recent_activity || []
        setActivities(raw.map((a: Record<string, unknown>) => {
          const showRaw = a.shows as unknown
          const show = (Array.isArray(showRaw) ? showRaw[0] : showRaw) as { name: string } | null
          return { ...a, shows: show }
        }))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  function handleOpen() {
    setOpen(!open)
    if (!open) {
      const now = new Date().toISOString()
      setLastChecked(now)
      localStorage.setItem('preroll:notifications:lastChecked', now)
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleOpen}
        className="flex items-center justify-center w-[30px] h-[30px] rounded-[7px] border border-transparent text-text-secondary hover:bg-surface-raised hover:border-border-subtle hover:text-text-primary transition-colors"
        title="Notifications"
      >
        <BellIcon className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[16px] h-4 rounded-full bg-accent text-white text-[10px] font-bold px-1">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[360px] rounded-[10px] border border-border-subtle bg-surface-raised shadow-xl overflow-hidden z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
            <h3 className="text-[13px] font-semibold text-text-primary">Notifications</h3>
            {activities.length > 0 && (
              <Link
                href="/app?tab=activity"
                onClick={() => setOpen(false)}
                className="text-[11px] text-text-secondary hover:text-text-primary transition-colors"
              >
                View all
              </Link>
            )}
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="px-4 py-8 text-center text-xs text-text-secondary">Loading...</div>
            ) : activities.length === 0 ? (
              <div className="px-4 py-8 text-center text-xs text-text-secondary">No recent activity</div>
            ) : (
              activities.map((a) => {
                const dot = ACTION_DOTS[a.action] || 'bg-text-tertiary'
                const isUnread = lastChecked ? a.created_at > lastChecked : false
                return (
                  <div
                    key={a.id}
                    className={`flex items-start gap-3 px-4 py-3 border-b border-border-subtle last:border-b-0 transition-colors ${
                      isUnread ? 'bg-accent/5' : ''
                    }`}
                  >
                    <span className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${dot}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] text-text-primary leading-snug">{a.description}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {a.shows?.name && (
                          <span className="text-[11px] text-text-secondary">{a.shows.name}</span>
                        )}
                        <span className="text-[11px] text-text-tertiary">{timeAgo(a.created_at)}</span>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function BellIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
    </svg>
  )
}

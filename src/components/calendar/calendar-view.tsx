'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface Episode {
  id: string
  title: string
  episode_number: number | null
  status: string
  scheduled_publish_date: string | null
  show_id: string
  shows: { id: string; name: string } | null
}

const SHOW_COLORS = [
  'oklch(0.72 0.16 275)',
  'oklch(0.72 0.16 155)',
  'oklch(0.72 0.16 30)',
  'oklch(0.75 0.14 85)',
  'oklch(0.65 0.18 330)',
  'oklch(0.65 0.15 200)',
]

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const STATUS_ICONS: Record<string, string> = {
  published: 'Published',
  approved: 'Approved',
  review: 'In Review',
  editing: 'Editing',
  recording: 'Recording',
  planning: 'Planning',
}

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const prevMonthDays = new Date(year, month, 0).getDate()

  const cells: { date: number; month: number; year: number; isCurrentMonth: boolean }[] = []

  for (let i = firstDay - 1; i >= 0; i--) {
    const d = prevMonthDays - i
    const m = month === 0 ? 11 : month - 1
    const y = month === 0 ? year - 1 : year
    cells.push({ date: d, month: m, year: y, isCurrentMonth: false })
  }

  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: d, month, year, isCurrentMonth: true })
  }

  const remaining = 7 - (cells.length % 7)
  if (remaining < 7) {
    for (let d = 1; d <= remaining; d++) {
      const m = month === 11 ? 0 : month + 1
      const y = month === 11 ? year + 1 : year
      cells.push({ date: d, month: m, year: y, isCurrentMonth: false })
    }
  }

  return cells
}

function toDateKey(year: number, month: number, date: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`
}

function formatMonthYear(year: number, month: number) {
  return new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export function CalendarView() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [loading, setLoading] = useState(true)
  const [showFilter, setShowFilter] = useState<string>('all')

  const showColorMap = new Map<string, string>()
  const showNames = new Map<string, string>()

  for (const ep of episodes) {
    if (ep.shows && !showColorMap.has(ep.show_id)) {
      showColorMap.set(ep.show_id, SHOW_COLORS[showColorMap.size % SHOW_COLORS.length])
      showNames.set(ep.show_id, ep.shows.name)
    }
  }

  const fetchEpisodes = useCallback(async () => {
    setLoading(true)
    const from = toDateKey(year, month, 1)
    const lastDay = new Date(year, month + 1, 0).getDate()
    const to = toDateKey(year, month, lastDay)
    try {
      const res = await fetch(`/api/v1/episodes?from=${from}&to=${to}`)
      if (res.ok) {
        const json = await res.json()
        setEpisodes(json.data || [])
      }
    } catch {
      setEpisodes([])
    } finally {
      setLoading(false)
    }
  }, [year, month])

  useEffect(() => { fetchEpisodes() }, [fetchEpisodes])

  useEffect(() => {
    if (showFilter !== 'all' && !showNames.has(showFilter)) {
      setShowFilter('all')
    }
  })

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }

  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  function goToday() {
    setYear(now.getFullYear())
    setMonth(now.getMonth())
  }

  const cells = getMonthDays(year, month)
  const todayKey = toDateKey(now.getFullYear(), now.getMonth(), now.getDate())

  const episodesByDate = new Map<string, Episode[]>()
  for (const ep of episodes) {
    if (!ep.scheduled_publish_date) continue
    if (showFilter !== 'all' && ep.show_id !== showFilter) continue
    const key = ep.scheduled_publish_date
    if (!episodesByDate.has(key)) episodesByDate.set(key, [])
    episodesByDate.get(key)!.push(ep)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-text-primary">
            {formatMonthYear(year, month)}
          </h2>
          <div className="flex items-center gap-1">
            <button
              onClick={prevMonth}
              className="rounded-md p-1.5 text-text-tertiary hover:text-text-primary hover:bg-surface-raised transition-colors"
            >
              <ChevronLeftIcon />
            </button>
            <button
              onClick={goToday}
              className="rounded-md px-2.5 py-1 text-xs font-medium text-text-tertiary hover:text-text-primary hover:bg-surface-raised transition-colors"
            >
              Today
            </button>
            <button
              onClick={nextMonth}
              className="rounded-md p-1.5 text-text-tertiary hover:text-text-primary hover:bg-surface-raised transition-colors"
            >
              <ChevronRightIcon />
            </button>
          </div>
        </div>

        {showNames.size > 1 && (
          <select
            value={showFilter}
            onChange={(e) => setShowFilter(e.target.value)}
            className="rounded-md border border-border-default bg-surface-input px-3 py-1.5 text-xs text-text-secondary focus:border-accent focus:outline-none"
          >
            <option value="all">All shows</option>
            {[...showNames.entries()].map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
        )}
      </div>

      <div className={`grid grid-cols-7 ${loading ? 'opacity-50' : ''} transition-opacity`}>
        {DAY_NAMES.map((day) => (
          <div key={day} className="py-2 text-center text-xs font-medium text-text-tertiary border-b border-border-subtle">
            {day}
          </div>
        ))}

        {cells.map((cell, i) => {
          const key = toDateKey(cell.year, cell.month, cell.date)
          const isToday = key === todayKey
          const dayEpisodes = episodesByDate.get(key) || []

          return (
            <div
              key={i}
              className={`min-h-24 border-b border-r border-border-subtle p-1.5 ${
                i % 7 === 0 ? 'border-l' : ''
              } ${cell.isCurrentMonth ? '' : 'bg-surface-base/50'}`}
            >
              <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                isToday
                  ? 'bg-accent text-white font-semibold'
                  : cell.isCurrentMonth
                    ? 'text-text-secondary'
                    : 'text-text-tertiary/50'
              }`}>
                {cell.date}
              </span>
              <div className="mt-0.5 space-y-0.5">
                {dayEpisodes.map((ep) => (
                  <Link
                    key={ep.id}
                    href={`/app/shows/${ep.show_id}/episodes/${ep.id}`}
                    className="group block rounded px-1.5 py-0.5 text-xs leading-tight truncate hover:bg-surface-overlay transition-colors"
                    style={{ borderLeft: `2px solid ${showColorMap.get(ep.show_id) || SHOW_COLORS[0]}` }}
                    title={`${ep.shows?.name || 'Show'} — ${ep.title} (${STATUS_ICONS[ep.status] || ep.status})`}
                  >
                    <span className="text-text-primary group-hover:text-accent-hover transition-colors">
                      {ep.episode_number ? `${ep.episode_number}. ` : ''}{ep.title}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {showNames.size > 0 && (
        <div className="mt-3 flex flex-wrap gap-3">
          {[...showNames.entries()].map(([id, name]) => (
            <div key={id} className="flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: showColorMap.get(id) }}
              />
              <span className="text-xs text-text-tertiary">{name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ChevronLeftIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
    </svg>
  )
}

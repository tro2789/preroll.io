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

const STATUS_LABELS: Record<string, string> = {
  published: 'Published',
  approved: 'Approved',
  review: 'In Review',
  editing: 'Editing',
  recording: 'Recording',
  planning: 'Planning',
}

type ViewMode = 'month' | 'week'

interface DayCell {
  date: number
  month: number
  year: number
  isCurrentMonth: boolean
}

function getMonthDays(year: number, month: number): DayCell[] {
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const prevMonthDays = new Date(year, month, 0).getDate()
  const cells: DayCell[] = []

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

function getWeekDays(year: number, month: number, date: number): DayCell[] {
  const d = new Date(year, month, date)
  const dayOfWeek = d.getDay()
  const cells: DayCell[] = []
  for (let i = 0; i < 7; i++) {
    const current = new Date(year, month, date - dayOfWeek + i)
    cells.push({
      date: current.getDate(),
      month: current.getMonth(),
      year: current.getFullYear(),
      isCurrentMonth: current.getMonth() === month,
    })
  }
  return cells
}

function toDateKey(year: number, month: number, date: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`
}

function formatMonthYear(year: number, month: number) {
  return new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function formatWeekRange(cells: DayCell[]) {
  const first = cells[0]
  const last = cells[6]
  const f = new Date(first.year, first.month, first.date)
  const l = new Date(last.year, last.month, last.date)
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  if (f.getFullYear() !== l.getFullYear()) {
    return `${f.toLocaleDateString('en-US', { ...opts, year: 'numeric' })} – ${l.toLocaleDateString('en-US', { ...opts, year: 'numeric' })}`
  }
  if (f.getMonth() !== l.getMonth()) {
    return `${f.toLocaleDateString('en-US', opts)} – ${l.toLocaleDateString('en-US', opts)}, ${f.getFullYear()}`
  }
  return `${f.toLocaleDateString('en-US', { month: 'long' })} ${f.getDate()}–${l.getDate()}, ${f.getFullYear()}`
}

export function CalendarView() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [weekAnchor, setWeekAnchor] = useState(now.getDate())
  const [view, setView] = useState<ViewMode>('month')
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

  const cells = view === 'month'
    ? getMonthDays(year, month)
    : getWeekDays(year, month, weekAnchor)

  const fetchRange = useCallback(() => {
    const first = cells[0]
    const last = cells[cells.length - 1]
    return {
      from: toDateKey(first.year, first.month, first.date),
      to: toDateKey(last.year, last.month, last.date),
    }
  }, [cells])

  const fetchEpisodes = useCallback(async () => {
    setLoading(true)
    const { from, to } = fetchRange()
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
  }, [fetchRange])

  useEffect(() => { fetchEpisodes() }, [fetchEpisodes])

  useEffect(() => {
    if (showFilter !== 'all' && !showNames.has(showFilter)) {
      setShowFilter('all')
    }
  })

  function prev() {
    if (view === 'month') {
      if (month === 0) { setMonth(11); setYear(y => y - 1) }
      else setMonth(m => m - 1)
    } else {
      const d = new Date(year, month, weekAnchor - 7)
      setYear(d.getFullYear())
      setMonth(d.getMonth())
      setWeekAnchor(d.getDate())
    }
  }

  function next() {
    if (view === 'month') {
      if (month === 11) { setMonth(0); setYear(y => y + 1) }
      else setMonth(m => m + 1)
    } else {
      const d = new Date(year, month, weekAnchor + 7)
      setYear(d.getFullYear())
      setMonth(d.getMonth())
      setWeekAnchor(d.getDate())
    }
  }

  function goToday() {
    setYear(now.getFullYear())
    setMonth(now.getMonth())
    setWeekAnchor(now.getDate())
  }

  const todayKey = toDateKey(now.getFullYear(), now.getMonth(), now.getDate())

  const episodesByDate = new Map<string, Episode[]>()
  for (const ep of episodes) {
    if (!ep.scheduled_publish_date) continue
    if (showFilter !== 'all' && ep.show_id !== showFilter) continue
    const key = ep.scheduled_publish_date
    if (!episodesByDate.has(key)) episodesByDate.set(key, [])
    episodesByDate.get(key)!.push(ep)
  }

  const heading = view === 'month'
    ? formatMonthYear(year, month)
    : formatWeekRange(cells)

  const rowCount = cells.length / 7

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 7rem)' }}>
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-text-primary">{heading}</h2>
          <div className="flex items-center gap-1">
            <button onClick={prev} className="rounded-md p-1.5 text-text-tertiary hover:text-text-primary hover:bg-surface-raised transition-colors">
              <ChevronLeftIcon />
            </button>
            <button onClick={goToday} className="rounded-md px-2.5 py-1 text-xs font-medium text-text-tertiary hover:text-text-primary hover:bg-surface-raised transition-colors">
              Today
            </button>
            <button onClick={next} className="rounded-md p-1.5 text-text-tertiary hover:text-text-primary hover:bg-surface-raised transition-colors">
              <ChevronRightIcon />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
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
          <div className="flex rounded-md border border-border-default overflow-hidden">
            <button
              onClick={() => setView('week')}
              className={`px-3 py-1 text-xs font-medium transition-colors ${
                view === 'week' ? 'bg-accent text-white' : 'text-text-tertiary hover:text-text-secondary bg-surface-input'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setView('month')}
              className={`px-3 py-1 text-xs font-medium transition-colors ${
                view === 'month' ? 'bg-accent text-white' : 'text-text-tertiary hover:text-text-secondary bg-surface-input'
              }`}
            >
              Month
            </button>
          </div>
        </div>
      </div>

      <div className={`grid grid-cols-7 flex-1 min-h-0 ${loading ? 'opacity-50' : ''} transition-opacity`}
        style={{ gridTemplateRows: `auto repeat(${rowCount}, 1fr)` }}
      >
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
              className={`border-b border-r border-border-subtle p-1.5 overflow-hidden flex flex-col ${
                i % 7 === 0 ? 'border-l' : ''
              } ${cell.isCurrentMonth ? '' : 'bg-surface-base/50'}`}
            >
              <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs shrink-0 ${
                isToday
                  ? 'bg-accent text-white font-semibold'
                  : cell.isCurrentMonth
                    ? 'text-text-secondary'
                    : 'text-text-tertiary/50'
              }`}>
                {cell.date}
              </span>
              <div className="mt-0.5 space-y-0.5 overflow-y-auto min-h-0 flex-1">
                {dayEpisodes.map((ep) => (
                  <Link
                    key={ep.id}
                    href={`/app/shows/${ep.show_id}/episodes/${ep.id}`}
                    className="group block rounded px-1.5 py-0.5 text-xs leading-tight truncate hover:bg-surface-overlay transition-colors"
                    style={{ borderLeft: `2px solid ${showColorMap.get(ep.show_id) || SHOW_COLORS[0]}` }}
                    title={`${ep.shows?.name || 'Show'} — ${ep.title} (${STATUS_LABELS[ep.status] || ep.status})`}
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
        <div className="mt-3 flex flex-wrap gap-3 shrink-0">
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

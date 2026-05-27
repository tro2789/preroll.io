'use client'

import { useEffect, useState, useCallback } from 'react'

interface EpisodeData {
  episode_id: string
  title: string
  episode_number: number | null
  total_downloads: number
  total_plays: number
  daily: { date: string; downloads: number }[]
}

interface TrendPoint {
  date: string
  downloads: number
  plays: number | null
  followers: number | null
}

interface AnalyticsData {
  summary: {
    total_downloads: number
    avg_downloads: number
    followers: number | null
  }
  episodes: EpisodeData[]
  trends: TrendPoint[]
}

const PERIODS = [
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
  { value: '12m', label: '12 months' },
  { value: 'all', label: 'All time' },
]

export function PortalAnalyticsDashboard({ showId }: { showId?: string }) {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [unavailable, setUnavailable] = useState(false)
  const [period, setPeriod] = useState('30d')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ period })
      if (showId) params.set('show_id', showId)
      const res = await fetch(`/api/v1/portal/analytics?${params}`)
      if (res.status === 403) { setUnavailable(true); return }
      const json = await res.json()
      setData(json.data ?? null)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [period, showId])

  useEffect(() => { fetchData() }, [fetchData])

  if (unavailable) return null
  if (loading) return <div className="text-sm text-text-tertiary py-8 text-center">Loading analytics...</div>
  if (!data || (data.episodes.length === 0 && data.trends.length === 0)) {
    return (
      <div className="rounded-[10px] border border-border-subtle bg-surface-raised p-8 text-center">
        <p className="text-sm text-text-secondary">No analytics data available yet.</p>
        <p className="text-xs text-text-tertiary mt-1">Data will appear here once your producer connects analytics sources.</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text-primary">Performance</h2>
        <div className="inline-flex items-center rounded-[7px] border border-border-subtle bg-surface-input p-[2px]">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`rounded-[4px] px-[9px] py-[3.5px] text-[12.5px] transition-colors ${
                period === p.value
                  ? 'bg-surface-overlay text-text-primary font-[500]'
                  : 'text-text-secondary font-[450] hover:text-text-primary'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <SummaryCard label="Total Downloads" value={formatNumber(data.summary.total_downloads)} />
        <SummaryCard label="Avg per Episode" value={formatNumber(data.summary.avg_downloads)} />
        <SummaryCard label="Followers" value={data.summary.followers != null ? formatNumber(data.summary.followers) : '--'} />
      </div>

      {data.episodes.length > 0 && (
        <div className="rounded-[10px] border border-border-subtle bg-surface-raised overflow-hidden">
          <div className="px-5 py-4 border-b border-border-subtle">
            <h3 className="text-sm font-semibold text-text-primary">Episodes</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-subtle text-left text-fg-faint">
                  <th className="px-5 py-3 text-[11px] font-semibold tracking-[0.04em] uppercase">Episode</th>
                  <th className="px-5 py-3 text-[11px] font-semibold tracking-[0.04em] uppercase text-right">Downloads</th>
                  <th className="px-5 py-3 text-[11px] font-semibold tracking-[0.04em] uppercase text-right">Plays</th>
                  <th className="px-5 py-3 text-[11px] font-semibold tracking-[0.04em] uppercase text-right">Trend</th>
                </tr>
              </thead>
              <tbody>
                {data.episodes.slice(0, 20).map((ep) => (
                  <tr key={ep.episode_id} className="border-b border-border-subtle last:border-0">
                    <td className="px-5 py-3">
                      <span className="text-text-primary font-medium">
                        {ep.episode_number != null && <span className="text-text-tertiary mr-1.5">#{ep.episode_number}</span>}
                        {ep.title}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-text-primary text-right tabular-nums">{formatNumber(ep.total_downloads)}</td>
                    <td className="px-5 py-3 text-text-secondary text-right tabular-nums">{formatNumber(ep.total_plays)}</td>
                    <td className="px-5 py-3 text-right">
                      <Sparkline data={ep.daily.slice(-7).map((d) => d.downloads)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data.trends.length > 0 && (
        <div className="rounded-[10px] border border-border-subtle bg-surface-raised overflow-hidden">
          <div className="px-5 py-4 border-b border-border-subtle">
            <h3 className="text-sm font-semibold text-text-primary">Downloads Over Time</h3>
          </div>
          <div className="p-5">
            <TrendChart data={data.trends} />
          </div>
        </div>
      )}
    </div>
  )
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[10px] border border-border-subtle bg-surface-raised p-4">
      <div className="text-[12px] font-[450] text-text-secondary">{label}</div>
      <div className="mt-1.5 font-[family-name:var(--font-display)] text-[24px] font-semibold tracking-[-0.02em] tabular-nums text-text-primary">{value}</div>
    </div>
  )
}

function Sparkline({ data }: { data: number[] }) {
  if (data.length < 2) return null
  const max = Math.max(...data, 1)
  const w = 60
  const h = 20
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * h}`).join(' ')
  return (
    <svg width={w} height={h} className="inline-block">
      <polyline points={points} fill="none" stroke="var(--color-accent, #e86a47)" strokeWidth="1.5" />
    </svg>
  )
}

function TrendChart({ data }: { data: TrendPoint[] }) {
  const maxVal = Math.max(...data.map((d) => d.downloads), 1)

  const grouped = groupByWeek(data)
  if (grouped.length === 0) return null

  return (
    <div className="space-y-2">
      {grouped.map((row) => (
        <div key={row.label} className="flex items-center gap-3">
          <span className="w-20 text-xs text-text-secondary text-right shrink-0">{row.label}</span>
          <div className="flex-1 flex items-center gap-2">
            <div
              className="h-4 rounded-sm bg-accent transition-all"
              style={{ width: `${(row.downloads / maxVal) * 100}%`, minWidth: row.downloads > 0 ? '4px' : '0' }}
            />
            <span className="text-xs text-text-tertiary tabular-nums">{formatNumber(row.downloads)}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

function groupByWeek(data: TrendPoint[]): { label: string; downloads: number }[] {
  const weeks = new Map<string, number>()
  for (const d of data) {
    const date = new Date(d.date)
    const weekStart = new Date(date)
    weekStart.setDate(date.getDate() - date.getDay())
    const key = weekStart.toISOString().slice(0, 10)
    weeks.set(key, (weeks.get(key) ?? 0) + d.downloads)
  }
  return [...weeks.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, downloads]) => {
      const d = new Date(key)
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      return { label: `${months[d.getMonth()]} ${d.getDate()}`, downloads }
    })
}

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return n.toLocaleString()
}

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
  providers: string[]
  episodes: EpisodeData[]
  trends: TrendPoint[]
}

const PROVIDER_LABELS: Record<string, string> = {
  apple: 'Apple Podcasts',
  spotify_csv: 'Spotify',
  transistor: 'Transistor',
  castopod: 'Castopod',
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
  const [provider, setProvider] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ period })
      if (showId) params.set('show_id', showId)
      if (provider) params.set('provider', provider)
      const res = await fetch(`/api/v1/portal/analytics?${params}`)
      if (res.status === 403) { setUnavailable(true); return }
      const json = await res.json()
      setData(json.data ?? null)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [period, showId, provider])

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

      {data.providers.length > 1 && (
        <div className="inline-flex items-center rounded-[7px] border border-border-subtle bg-surface-input p-[2px]">
          <button
            onClick={() => setProvider('')}
            className={`rounded-[4px] px-[9px] py-[3.5px] text-[12.5px] transition-colors ${
              !provider
                ? 'bg-surface-overlay text-text-primary font-[500]'
                : 'text-text-secondary font-[450] hover:text-text-primary'
            }`}
          >
            All
          </button>
          {data.providers.map((p) => (
            <button
              key={p}
              onClick={() => setProvider(p)}
              className={`rounded-[4px] px-[9px] py-[3.5px] text-[12.5px] transition-colors ${
                provider === p
                  ? 'bg-surface-overlay text-text-primary font-[500]'
                  : 'text-text-secondary font-[450] hover:text-text-primary'
              }`}
            >
              {PROVIDER_LABELS[p] || p}
            </button>
          ))}
        </div>
      )}

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

function niceScale(minVal: number, maxVal: number, tickCount: number): number[] {
  const range = maxVal - minVal || 1
  const roughStep = range / tickCount
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)))
  const residual = roughStep / magnitude
  const niceStep = residual <= 1.5 ? magnitude : residual <= 3 ? 2 * magnitude : residual <= 7 ? 5 * magnitude : 10 * magnitude
  const niceMin = Math.floor(minVal / niceStep) * niceStep
  const niceMax = Math.ceil(maxVal / niceStep) * niceStep
  const ticks: number[] = []
  for (let v = niceMin; v <= niceMax + niceStep * 0.5; v += niceStep) {
    ticks.push(Math.round(v))
  }
  return ticks
}

function TrendChart({ data }: { data: TrendPoint[] }) {
  if (data.length < 2) return null

  const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date))
  const values = sorted.map((d) => d.downloads)
  const rawMax = Math.max(...values, 1)
  const rawMin = Math.min(...values)

  const ticks = niceScale(rawMin, rawMax, 4)
  const scaleMin = ticks[0]
  const scaleMax = ticks[ticks.length - 1]
  const scaleRange = scaleMax - scaleMin || 1

  const W = 600
  const H = 160
  const padL = 45
  const padR = 12
  const padT = 8
  const padB = 28
  const chartW = W - padL - padR
  const chartH = H - padT - padB

  const points = sorted.map((d, i) => ({
    x: padL + (i / (sorted.length - 1)) * chartW,
    y: padT + chartH - ((d.downloads - scaleMin) / scaleRange) * chartH,
    date: d.date,
    downloads: d.downloads,
  }))

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
  const areaPath = `${linePath} L${points[points.length - 1].x},${padT + chartH} L${points[0].x},${padT + chartH} Z`

  const yLabels = ticks.map((val) => ({
    y: padT + chartH - ((val - scaleMin) / scaleRange) * chartH,
    label: formatNumber(val),
  }))

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const xLabelCount = Math.min(sorted.length, 6)
  const xLabels = Array.from({ length: xLabelCount }, (_, i) => {
    const idx = Math.round((i / (xLabelCount - 1)) * (sorted.length - 1))
    const d = new Date(sorted[idx].date + 'T00:00:00')
    return { x: points[idx].x, label: `${months[d.getMonth()]} ${d.getDate()}` }
  })

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
      {yLabels.map((yl, i) => (
        <g key={i}>
          <line x1={padL} y1={yl.y} x2={W - padR} y2={yl.y} stroke="var(--color-border-subtle, #333)" strokeWidth="0.5" />
          <text x={padL - 6} y={yl.y + 3.5} textAnchor="end" className="fill-text-tertiary" style={{ fontSize: '9px' }}>{yl.label}</text>
        </g>
      ))}
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-accent, #e86a47)" stopOpacity="0.25" />
          <stop offset="100%" stopColor="var(--color-accent, #e86a47)" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#areaGrad)" />
      <path d={linePath} fill="none" stroke="var(--color-accent, #e86a47)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="2.5" fill="var(--color-accent, #e86a47)" opacity={sorted.length <= 14 ? 1 : 0} />
      ))}
      {xLabels.map((xl, i) => (
        <text key={i} x={xl.x} y={H - 4} textAnchor="middle" className="fill-text-tertiary" style={{ fontSize: '9px' }}>{xl.label}</text>
      ))}
    </svg>
  )
}

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return n.toLocaleString()
}

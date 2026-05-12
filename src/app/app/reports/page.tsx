'use client'

import { useEffect, useState, useCallback } from 'react'
import { UpgradeGate } from '@/components/ui/upgrade-gate'

interface ReportData {
  period: string
  episodes: { total: number; published: number; in_progress: number }
  on_time_rate: number | null
  avg_days_to_publish: number | null
  deliverables: {
    total: number
    approved: number
    revision_requested: number
    pending: number
    avg_approval_days: number | null
  }
  episodes_by_show: {
    show_id: string
    show_name: string
    client_name: string
    total: number
    published: number
  }[]
  episodes_by_month: {
    month: string
    created: number
    published: number
  }[]
}

interface ShowOption {
  id: string
  name: string
}

const PERIODS = [
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
  { value: '12m', label: '12 months' },
  { value: 'all', label: 'All time' },
]

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [gated, setGated] = useState(false)
  const [period, setPeriod] = useState('90d')
  const [showId, setShowId] = useState('')
  const [shows, setShows] = useState<ShowOption[]>([])

  useEffect(() => {
    if (gated) return
    fetch('/api/v1/shows')
      .then((r) => r.json())
      .then((r) => setShows(r.data || []))
      .catch(() => {})
  }, [gated])

  const fetchReports = useCallback(async () => {
    if (gated) return
    setLoading(true)
    try {
      const params = new URLSearchParams({ period })
      if (showId) params.set('show_id', showId)
      const r = await fetch(`/api/v1/reports?${params}`)
      if (r.status === 403) { setGated(true); return }
      const json = await r.json()
      setData(json.data || null)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [period, showId, gated])

  useEffect(() => {
    fetchReports()
  }, [fetchReports])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.02em] font-[family-name:var(--font-display)] text-text-primary">Reports</h1>
          <p className="text-[13.5px] text-text-secondary mt-1.5 max-w-[62ch]">Publishing throughput, reliability, and turnaround across the org.</p>
        </div>

        {!gated && (
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={showId}
              onChange={(e) => setShowId(e.target.value)}
              className="rounded-lg border border-border-default bg-surface-overlay px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="">All shows</option>
              {shows.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>

            <div className="flex rounded-lg border border-border-default bg-surface-overlay p-0.5">
              {PERIODS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPeriod(p.value)}
                  className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                    period === p.value
                      ? 'bg-accent text-white'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {gated ? (
        <UpgradeGate
          feature="Reporting & Analytics"
          description="Track episodes published, on-time rates, approval turnaround, and trends by show and month. Available on the Studio plan."
          tier="Studio"
          icon={
            <svg className="h-6 w-6 text-accent" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
            </svg>
          }
        />
      ) : loading ? (
        <div className="text-sm text-text-tertiary py-12 text-center">Loading reports...</div>
      ) : !data ? (
        <div className="text-sm text-text-secondary py-12 text-center">Failed to load reports.</div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              label="Episodes Published"
              value={data.episodes.published}
              sub={`${data.episodes.total} total`}
            />
            <StatCard
              label="On-Time Rate"
              value={data.on_time_rate !== null ? `${Math.round(data.on_time_rate * 100)}%` : '--'}
              sub={data.on_time_rate !== null ? 'of scheduled episodes' : 'No scheduled episodes'}
            />
            <StatCard
              label="Avg Days to Publish"
              value={data.avg_days_to_publish !== null ? data.avg_days_to_publish : '--'}
              sub="from creation to publish"
            />
            <StatCard
              label="Deliverables Approved"
              value={data.deliverables.approved}
              sub={data.deliverables.avg_approval_days !== null
                ? `${data.deliverables.avg_approval_days}d avg turnaround`
                : `${data.deliverables.total} total`
              }
            />
          </div>

          {data.episodes.total === 0 ? (
            <div className="rounded-xl border border-border-default bg-surface-raised p-8 text-center text-sm text-text-tertiary">
              No episode data for this period.
            </div>
          ) : (
            <>
              <div className="rounded-xl border border-border-default bg-surface-raised overflow-hidden">
                <div className="px-5 py-4 border-b border-border-subtle">
                  <h2 className="text-sm font-semibold text-text-primary">Episodes by Show</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border-subtle text-left text-text-secondary">
                        <th className="px-5 py-3 font-medium">Show</th>
                        <th className="px-5 py-3 font-medium">Client</th>
                        <th className="px-5 py-3 font-medium text-right">Total</th>
                        <th className="px-5 py-3 font-medium text-right">Published</th>
                        <th className="px-5 py-3 font-medium text-right">In Progress</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.episodes_by_show.map((row) => (
                        <tr key={row.show_id} className="border-b border-border-subtle last:border-0">
                          <td className="px-5 py-3 text-text-primary font-medium">{row.show_name}</td>
                          <td className="px-5 py-3 text-text-secondary">{row.client_name}</td>
                          <td className="px-5 py-3 text-text-primary text-right">{row.total}</td>
                          <td className="px-5 py-3 text-text-primary text-right">{row.published}</td>
                          <td className="px-5 py-3 text-text-secondary text-right">{row.total - row.published}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {data.episodes_by_month.length > 0 && (
                <div className="rounded-xl border border-border-default bg-surface-raised overflow-hidden">
                  <div className="px-5 py-4 border-b border-border-subtle">
                    <h2 className="text-sm font-semibold text-text-primary">Episodes by Month</h2>
                  </div>
                  <div className="p-5">
                    <MonthChart data={data.episodes_by_month} />
                  </div>
                </div>
              )}

              {data.deliverables.total > 0 && (
                <div className="rounded-xl border border-border-default bg-surface-raised overflow-hidden">
                  <div className="px-5 py-4 border-b border-border-subtle">
                    <h2 className="text-sm font-semibold text-text-primary">Deliverable Breakdown</h2>
                  </div>
                  <div className="grid grid-cols-3 divide-x divide-border-subtle">
                    <div className="px-5 py-4 text-center">
                      <div className="text-2xl font-bold text-text-primary">{data.deliverables.approved}</div>
                      <div className="text-xs text-text-secondary mt-1">Approved</div>
                    </div>
                    <div className="px-5 py-4 text-center">
                      <div className="text-2xl font-bold text-text-primary">{data.deliverables.revision_requested}</div>
                      <div className="text-xs text-text-secondary mt-1">Revisions</div>
                    </div>
                    <div className="px-5 py-4 text-center">
                      <div className="text-2xl font-bold text-text-primary">{data.deliverables.pending}</div>
                      <div className="text-xs text-text-secondary mt-1">Pending</div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string
  value: string | number
  sub: string
}) {
  return (
    <div className="rounded-xl border border-border-default bg-surface-raised p-5">
      <div className="text-xs font-medium text-text-secondary uppercase tracking-wider">{label}</div>
      <div className="mt-2 text-2xl font-bold text-text-primary">{value}</div>
      <div className="mt-1 text-xs text-text-secondary">{sub}</div>
    </div>
  )
}

function MonthChart({ data }: { data: { month: string; created: number; published: number }[] }) {
  const maxVal = Math.max(...data.flatMap((d) => [d.created, d.published]), 1)

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4 text-xs text-text-secondary">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-accent/40" />
          Created
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-accent" />
          Published
        </span>
      </div>
      {data.map((row) => {
        const label = formatMonth(row.month)
        return (
          <div key={row.month} className="flex items-center gap-3">
            <span className="w-16 text-xs text-text-secondary text-right shrink-0">{label}</span>
            <div className="flex-1 flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <div
                  className="h-4 rounded-sm bg-accent/40 transition-all"
                  style={{ width: `${(row.created / maxVal) * 100}%`, minWidth: row.created > 0 ? '4px' : '0' }}
                />
                <span className="text-xs text-text-tertiary">{row.created}</span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="h-4 rounded-sm bg-accent transition-all"
                  style={{ width: `${(row.published / maxVal) * 100}%`, minWidth: row.published > 0 ? '4px' : '0' }}
                />
                <span className="text-xs text-text-tertiary">{row.published}</span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function formatMonth(ym: string): string {
  const [y, m] = ym.split('-')
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[parseInt(m, 10) - 1]} ${y.slice(2)}`
}

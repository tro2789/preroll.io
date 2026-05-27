'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
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

interface EpisodeAnalytics {
  episode_id: string
  show_id: string
  title: string
  episode_number: number | null
  total_downloads: number
  total_plays: number
  total_listeners: number
  avg_completion_rate: number | null
  daily: { date: string; downloads: number; plays: number | null }[]
  providers: string[]
}

interface ShowAnalytics {
  show_id: string
  show_name: string
  latest_followers: number | null
  total_downloads: number
  total_plays: number
  total_new_followers: number
  latest_top_countries: unknown | null
  latest_top_devices: unknown | null
  latest_top_apps: unknown | null
  daily: { date: string; downloads: number; plays: number | null; followers: number | null }[]
  providers: string[]
}

interface CompareEpisode {
  episode_id: string
  title: string
  episode_number: number | null
  published_at: string | null
  daily: { day: number; date: string; downloads: number; cumulative: number }[]
}

type AudienceSortKey = 'title' | 'total_downloads' | 'total_plays' | 'total_listeners' | 'avg_completion_rate'

const PERIODS = [
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
  { value: '12m', label: '12 months' },
  { value: 'all', label: 'All time' },
]

const COMPARE_COLORS = ['var(--color-accent)', '#e879f9', '#fb923c', '#34d399']

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [gated, setGated] = useState(false)
  const [period, setPeriod] = useState('90d')
  const [showId, setShowId] = useState('')
  const [shows, setShows] = useState<ShowOption[]>([])
  const [activeTab, setActiveTab] = useState<'production' | 'audience'>('production')

  // Audience state
  const [audienceEpisodes, setAudienceEpisodes] = useState<EpisodeAnalytics[]>([])
  const [audienceShows, setAudienceShows] = useState<ShowAnalytics[]>([])
  const [audienceLoading, setAudienceLoading] = useState(false)
  const [audienceGated, setAudienceGated] = useState(false)
  const [audienceProvider, setAudienceProvider] = useState('')
  const [audienceSortKey, setAudienceSortKey] = useState<AudienceSortKey>('total_downloads')
  const [audienceSortAsc, setAudienceSortAsc] = useState(false)
  const [selectedEpisodes, setSelectedEpisodes] = useState<Set<string>>(new Set())
  const [compareData, setCompareData] = useState<CompareEpisode[] | null>(null)
  const [compareLoading, setCompareLoading] = useState(false)

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

  const fetchAudienceData = useCallback(async () => {
    if (audienceGated) return
    setAudienceLoading(true)
    try {
      const params = new URLSearchParams({ period })
      if (showId) params.set('show_id', showId)
      if (audienceProvider) params.set('provider', audienceProvider)

      const [epRes, showRes] = await Promise.all([
        fetch(`/api/v1/analytics/episodes?${params}`),
        fetch(`/api/v1/analytics/shows?${params}`),
      ])

      if (epRes.status === 403 || showRes.status === 403) {
        setAudienceGated(true)
        return
      }

      const epJson = await epRes.json()
      const showJson = await showRes.json()
      setAudienceEpisodes(epJson.data || [])
      setAudienceShows(showJson.data || [])
    } catch {
      // silent
    } finally {
      setAudienceLoading(false)
    }
  }, [period, showId, audienceProvider, audienceGated])

  useEffect(() => {
    if (activeTab === 'audience') {
      fetchAudienceData()
    }
  }, [activeTab, fetchAudienceData])

  // Reset selections when filters change
  useEffect(() => {
    setSelectedEpisodes(new Set())
    setCompareData(null)
  }, [period, showId, audienceProvider])

  const allProviders = useMemo(() => {
    const set = new Set<string>()
    for (const ep of audienceEpisodes) {
      for (const p of ep.providers) set.add(p)
    }
    for (const s of audienceShows) {
      for (const p of s.providers) set.add(p)
    }
    return [...set].sort()
  }, [audienceEpisodes, audienceShows])

  const sortedEpisodes = useMemo(() => {
    const sorted = [...audienceEpisodes].sort((a, b) => {
      let av: number | string, bv: number | string
      switch (audienceSortKey) {
        case 'title': av = a.title.toLowerCase(); bv = b.title.toLowerCase(); break
        case 'total_downloads': av = a.total_downloads; bv = b.total_downloads; break
        case 'total_plays': av = a.total_plays; bv = b.total_plays; break
        case 'total_listeners': av = a.total_listeners; bv = b.total_listeners; break
        case 'avg_completion_rate': av = a.avg_completion_rate ?? -1; bv = b.avg_completion_rate ?? -1; break
        default: av = a.total_downloads; bv = b.total_downloads
      }
      if (av < bv) return audienceSortAsc ? -1 : 1
      if (av > bv) return audienceSortAsc ? 1 : -1
      return 0
    })
    return sorted
  }, [audienceEpisodes, audienceSortKey, audienceSortAsc])

  // Audience summary stats
  const audienceSummary = useMemo(() => {
    const totalDownloads = audienceEpisodes.reduce((sum, ep) => sum + ep.total_downloads, 0)
    const avgDownloadsPerEpisode = audienceEpisodes.length > 0
      ? Math.round(totalDownloads / audienceEpisodes.length)
      : 0
    const followers = audienceShows.reduce((sum, s) => sum + (s.latest_followers ?? 0), 0)
    const completionRates = audienceEpisodes
      .map((ep) => ep.avg_completion_rate)
      .filter((r): r is number => r != null)
    const avgCompletion = completionRates.length > 0
      ? Math.round(completionRates.reduce((s, v) => s + v, 0) / completionRates.length)
      : null

    return { totalDownloads, avgDownloadsPerEpisode, followers, avgCompletion }
  }, [audienceEpisodes, audienceShows])

  const showTrendDaily = useMemo(() => {
    const byDate = new Map<string, number>()
    for (const s of audienceShows) {
      for (const d of s.daily) {
        byDate.set(d.date, (byDate.get(d.date) ?? 0) + d.downloads)
      }
    }
    return [...byDate.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, downloads]) => ({ date, downloads }))
  }, [audienceShows])

  const handleSort = (key: AudienceSortKey) => {
    if (audienceSortKey === key) {
      setAudienceSortAsc(!audienceSortAsc)
    } else {
      setAudienceSortKey(key)
      setAudienceSortAsc(false)
    }
  }

  const toggleEpisodeSelection = (episodeId: string) => {
    setSelectedEpisodes((prev) => {
      const next = new Set(prev)
      if (next.has(episodeId)) {
        next.delete(episodeId)
      } else if (next.size < 4) {
        next.add(episodeId)
      }
      return next
    })
  }

  const handleCompare = async () => {
    if (selectedEpisodes.size < 2) return
    setCompareLoading(true)
    try {
      const ids = [...selectedEpisodes].join(',')
      const res = await fetch(`/api/v1/analytics/compare?episode_ids=${ids}`)
      if (res.ok) {
        const json = await res.json()
        setCompareData(json.data || [])
      }
    } catch {
      // silent
    } finally {
      setCompareLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.02em] font-[family-name:var(--font-display)] text-text-primary">Reports</h1>
        </div>

        {!gated && (
          <div className="flex flex-wrap items-center gap-3">
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

            <select
              value={showId}
              onChange={(e) => setShowId(e.target.value)}
              className="inline-flex items-center gap-1.5 rounded-[7px] border border-border-subtle bg-surface-input px-[9px] py-[4px] text-[12.5px] font-[450] text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="">All shows</option>
              {shows.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Tab navigation */}
      <nav className="flex gap-1 border-b border-border-default mb-6">
        <button
          onClick={() => setActiveTab('production')}
          className={`px-4 py-2 text-sm font-medium transition-colors -mb-px ${
            activeTab === 'production'
              ? 'text-accent-hover border-b-2 border-accent'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Production
        </button>
        <button
          onClick={() => setActiveTab('audience')}
          className={`px-4 py-2 text-sm font-medium transition-colors -mb-px ${
            activeTab === 'audience'
              ? 'text-accent-hover border-b-2 border-accent'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Audience
        </button>
      </nav>

      {activeTab === 'production' ? (
        <>
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
                <div className="rounded-[10px] border border-border-subtle bg-surface-raised p-8 text-center text-sm text-text-tertiary">
                  No episode data for this period.
                </div>
              ) : (
                <>
                  <div className="rounded-[10px] border border-border-subtle bg-surface-raised overflow-hidden">
                    <div className="px-5 py-4 border-b border-border-subtle">
                      <h2 className="text-sm font-semibold text-text-primary">Episodes by Show</h2>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border-subtle text-left text-fg-faint">
                            <th className="px-5 py-3 text-[11px] font-semibold tracking-[0.04em] uppercase">Show</th>
                            <th className="px-5 py-3 text-[11px] font-semibold tracking-[0.04em] uppercase">Client</th>
                            <th className="px-5 py-3 text-[11px] font-semibold tracking-[0.04em] uppercase text-right">Total</th>
                            <th className="px-5 py-3 text-[11px] font-semibold tracking-[0.04em] uppercase text-right">Published</th>
                            <th className="px-5 py-3 text-[11px] font-semibold tracking-[0.04em] uppercase text-right">In Progress</th>
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
                    <div className="rounded-[10px] border border-border-subtle bg-surface-raised overflow-hidden">
                      <div className="px-5 py-4 border-b border-border-subtle">
                        <h2 className="text-sm font-semibold text-text-primary">Episodes by Month</h2>
                      </div>
                      <div className="p-5">
                        <MonthChart data={data.episodes_by_month} />
                      </div>
                    </div>
                  )}

                  {data.deliverables.total > 0 && (
                    <div className="rounded-[10px] border border-border-subtle bg-surface-raised overflow-hidden">
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
        </>
      ) : (
        /* Audience tab */
        <>
          {audienceGated ? (
            <UpgradeGate
              feature="Audience Analytics"
              description="Track downloads, listeners, completion rates, and compare episode performance across providers. Available on the Studio plan."
              tier="Studio"
              icon={
                <svg className="h-6 w-6 text-accent" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
                </svg>
              }
            />
          ) : audienceLoading ? (
            <div className="text-sm text-text-tertiary py-12 text-center">Loading audience analytics...</div>
          ) : (
            <>
              {/* Provider filter */}
              {allProviders.length > 1 && (
                <div className="inline-flex items-center rounded-[7px] border border-border-subtle bg-surface-input p-[2px]">
                  <button
                    onClick={() => setAudienceProvider('')}
                    className={`rounded-[4px] px-[9px] py-[3.5px] text-[12.5px] transition-colors ${
                      audienceProvider === ''
                        ? 'bg-surface-overlay text-text-primary font-[500]'
                        : 'text-text-secondary font-[450] hover:text-text-primary'
                    }`}
                  >
                    All
                  </button>
                  {allProviders.map((p) => (
                    <button
                      key={p}
                      onClick={() => setAudienceProvider(p)}
                      className={`rounded-[4px] px-[9px] py-[3.5px] text-[12.5px] transition-colors capitalize ${
                        audienceProvider === p
                          ? 'bg-surface-overlay text-text-primary font-[500]'
                          : 'text-text-secondary font-[450] hover:text-text-primary'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}

              {/* Summary cards */}
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <StatCard
                  label="Total Downloads"
                  value={formatNumber(audienceSummary.totalDownloads)}
                  sub={`${PERIODS.find((p) => p.value === period)?.label ?? period} total`}
                />
                <StatCard
                  label="Avg Downloads / Episode"
                  value={formatNumber(audienceSummary.avgDownloadsPerEpisode)}
                  sub={`across ${audienceEpisodes.length} episodes`}
                />
                <StatCard
                  label="Followers"
                  value={formatNumber(audienceSummary.followers)}
                  sub="latest count"
                />
                <StatCard
                  label="Avg Completion Rate"
                  value={audienceSummary.avgCompletion !== null ? `${audienceSummary.avgCompletion}%` : '--'}
                  sub={audienceSummary.avgCompletion !== null ? 'average across episodes' : 'No completion data'}
                />
              </div>

              {audienceEpisodes.length === 0 && audienceShows.length === 0 ? (
                <div className="rounded-[10px] border border-border-subtle bg-surface-raised p-8 text-center text-sm text-text-tertiary">
                  No audience data for this period. Analytics data is synced from your podcast hosting provider.
                </div>
              ) : (
                <>
                  {/* Episode performance table */}
                  {audienceEpisodes.length > 0 && (
                    <div className="rounded-[10px] border border-border-subtle bg-surface-raised overflow-hidden">
                      <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-text-primary">Episode Performance</h2>
                        {selectedEpisodes.size >= 2 && (
                          <button
                            onClick={handleCompare}
                            disabled={compareLoading}
                            className="inline-flex items-center gap-1.5 rounded-[7px] bg-accent px-3 py-1.5 text-[12.5px] font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
                          >
                            {compareLoading ? 'Loading...' : `Compare ${selectedEpisodes.size} episodes`}
                          </button>
                        )}
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border-subtle text-left text-fg-faint">
                              <th className="px-5 py-3 w-10">
                                <span className="sr-only">Select</span>
                              </th>
                              <SortableHeader
                                label="Episode"
                                sortKey="title"
                                currentKey={audienceSortKey}
                                ascending={audienceSortAsc}
                                onSort={handleSort}
                              />
                              <SortableHeader
                                label="Downloads"
                                sortKey="total_downloads"
                                currentKey={audienceSortKey}
                                ascending={audienceSortAsc}
                                onSort={handleSort}
                                align="right"
                              />
                              <SortableHeader
                                label="Plays"
                                sortKey="total_plays"
                                currentKey={audienceSortKey}
                                ascending={audienceSortAsc}
                                onSort={handleSort}
                                align="right"
                              />
                              <SortableHeader
                                label="Listeners"
                                sortKey="total_listeners"
                                currentKey={audienceSortKey}
                                ascending={audienceSortAsc}
                                onSort={handleSort}
                                align="right"
                              />
                              <SortableHeader
                                label="Completion"
                                sortKey="avg_completion_rate"
                                currentKey={audienceSortKey}
                                ascending={audienceSortAsc}
                                onSort={handleSort}
                                align="right"
                              />
                              <th className="px-5 py-3 text-[11px] font-semibold tracking-[0.04em] uppercase text-right">7-Day Trend</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sortedEpisodes.map((ep) => {
                              const isSelected = selectedEpisodes.has(ep.episode_id)
                              const atLimit = selectedEpisodes.size >= 4 && !isSelected
                              return (
                                <tr key={ep.episode_id} className="border-b border-border-subtle last:border-0">
                                  <td className="px-5 py-3">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      disabled={atLimit}
                                      onChange={() => toggleEpisodeSelection(ep.episode_id)}
                                      className="h-3.5 w-3.5 rounded border-border-subtle text-accent focus:ring-accent disabled:opacity-30"
                                    />
                                  </td>
                                  <td className="px-5 py-3 text-text-primary font-medium max-w-[240px] truncate">
                                    {ep.episode_number != null && (
                                      <span className="text-text-tertiary mr-1.5">#{ep.episode_number}</span>
                                    )}
                                    {ep.title}
                                  </td>
                                  <td className="px-5 py-3 text-text-primary text-right tabular-nums">{formatNumber(ep.total_downloads)}</td>
                                  <td className="px-5 py-3 text-text-primary text-right tabular-nums">{formatNumber(ep.total_plays)}</td>
                                  <td className="px-5 py-3 text-text-primary text-right tabular-nums">{formatNumber(ep.total_listeners)}</td>
                                  <td className="px-5 py-3 text-text-primary text-right tabular-nums">
                                    {ep.avg_completion_rate !== null ? `${Math.round(ep.avg_completion_rate)}%` : '--'}
                                  </td>
                                  <td className="px-5 py-3 text-right">
                                    <Sparkline data={ep.daily.slice(0, 7).map((d) => d.downloads)} />
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Episode comparison chart */}
                  {compareData && compareData.length >= 2 && (
                    <div className="rounded-[10px] border border-border-subtle bg-surface-raised overflow-hidden">
                      <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-text-primary">Episode Comparison</h2>
                        <button
                          onClick={() => { setCompareData(null); setSelectedEpisodes(new Set()) }}
                          className="text-[12.5px] text-text-secondary hover:text-text-primary transition-colors"
                        >
                          Clear
                        </button>
                      </div>
                      <div className="p-5">
                        <ComparisonChart episodes={compareData} />
                      </div>
                    </div>
                  )}

                  {/* Show-level trends */}
                  {showTrendDaily.length > 1 && (
                    <div className="rounded-[10px] border border-border-subtle bg-surface-raised overflow-hidden">
                      <div className="px-5 py-4 border-b border-border-subtle">
                        <h2 className="text-sm font-semibold text-text-primary">Downloads Over Time</h2>
                      </div>
                      <div className="p-5">
                        <TrendAreaChart data={showTrendDaily} />
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}

/* ---------- Sub-components ---------- */

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
    <div className="rounded-[10px] border border-border-subtle bg-surface-raised p-5">
      <div className="text-[12px] font-[450] text-text-secondary">{label}</div>
      <div className="mt-2 font-[family-name:var(--font-display)] text-[30px] font-semibold tracking-[-0.02em] tabular-nums text-text-primary">{value}</div>
      <div className="mt-1 text-[11.5px] text-text-tertiary">{sub}</div>
    </div>
  )
}

function SortableHeader({
  label,
  sortKey,
  currentKey,
  ascending,
  onSort,
  align,
}: {
  label: string
  sortKey: AudienceSortKey
  currentKey: AudienceSortKey
  ascending: boolean
  onSort: (key: AudienceSortKey) => void
  align?: 'right'
}) {
  const isActive = currentKey === sortKey
  return (
    <th
      className={`px-5 py-3 text-[11px] font-semibold tracking-[0.04em] uppercase cursor-pointer select-none hover:text-text-primary transition-colors ${
        align === 'right' ? 'text-right' : ''
      } ${isActive ? 'text-text-primary' : ''}`}
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {align === 'right' && isActive && (
          <svg className="h-3 w-3 shrink-0" viewBox="0 0 12 12" fill="currentColor">
            {ascending
              ? <path d="M6 2l4 5H2z" />
              : <path d="M6 10l4-5H2z" />
            }
          </svg>
        )}
        {label}
        {align !== 'right' && isActive && (
          <svg className="h-3 w-3 shrink-0" viewBox="0 0 12 12" fill="currentColor">
            {ascending
              ? <path d="M6 2l4 5H2z" />
              : <path d="M6 10l4-5H2z" />
            }
          </svg>
        )}
      </span>
    </th>
  )
}

function Sparkline({ data }: { data: number[] }) {
  if (data.length < 2) return <span className="text-text-tertiary text-xs">--</span>

  const w = 60
  const h = 20
  const max = Math.max(...data, 1)
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - (v / max) * h
    return `${x},${y}`
  }).join(' ')

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="inline-block">
      <polyline
        points={points}
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function TrendAreaChart({ data }: { data: { date: string; downloads: number }[] }) {
  if (data.length < 2) return null

  const values = data.map((d) => d.downloads)
  const maxVal = Math.max(...values, 1)
  const minVal = Math.min(...values)
  const range = maxVal - minVal || 1

  const W = 600
  const H = 180
  const padL = 50
  const padR = 12
  const padT = 8
  const padB = 28
  const chartW = W - padL - padR
  const chartH = H - padT - padB

  const points = data.map((d, i) => ({
    x: padL + (i / (data.length - 1)) * chartW,
    y: padT + chartH - ((d.downloads - minVal) / range) * chartH,
  }))

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
  const areaPath = `${linePath} L${points[points.length - 1].x},${padT + chartH} L${points[0].x},${padT + chartH} Z`

  const gridLines = 4
  const yLabels = Array.from({ length: gridLines + 1 }, (_, i) => {
    const val = minVal + (range * i) / gridLines
    return { y: padT + chartH - (i / gridLines) * chartH, label: formatNumber(Math.round(val)) }
  })

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const xLabelCount = Math.min(data.length, 7)
  const xLabels = Array.from({ length: xLabelCount }, (_, i) => {
    const idx = Math.round((i / (xLabelCount - 1)) * (data.length - 1))
    const d = new Date(data[idx].date + 'T00:00:00')
    return { x: points[idx].x, label: `${MONTHS[d.getMonth()]} ${d.getDate()}` }
  })

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
      {yLabels.map((yl, i) => (
        <g key={i}>
          <line x1={padL} y1={yl.y} x2={W - padR} y2={yl.y} stroke="var(--color-border-subtle, #333)" strokeWidth="0.5" />
          <text x={padL - 6} y={yl.y + 3.5} textAnchor="end" className="fill-text-tertiary" style={{ fontSize: '10px' }}>{yl.label}</text>
        </g>
      ))}
      <defs>
        <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-accent, #e86a47)" stopOpacity="0.25" />
          <stop offset="100%" stopColor="var(--color-accent, #e86a47)" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#trendGrad)" />
      <path d={linePath} fill="none" stroke="var(--color-accent, #e86a47)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {data.length <= 14 && points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="2.5" fill="var(--color-accent, #e86a47)" />
      ))}
      {xLabels.map((xl, i) => (
        <text key={i} x={xl.x} y={H - 4} textAnchor="middle" className="fill-text-tertiary" style={{ fontSize: '10px' }}>{xl.label}</text>
      ))}
    </svg>
  )
}

function ComparisonChart({ episodes }: { episodes: CompareEpisode[] }) {
  const maxDays = Math.max(...episodes.map((ep) => ep.daily.length), 1)
  const maxCumulative = Math.max(...episodes.flatMap((ep) => ep.daily.map((d) => d.cumulative)), 1)

  const chartW = 500
  const chartH = 200
  const padL = 50
  const padB = 24
  const padT = 8
  const padR = 8
  const innerW = chartW - padL - padR
  const innerH = chartH - padT - padB

  // Y-axis labels
  const ySteps = 4
  const yLabels = Array.from({ length: ySteps + 1 }, (_, i) => Math.round((maxCumulative / ySteps) * i))

  return (
    <div className="space-y-3">
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-text-secondary">
        {episodes.map((ep, i) => (
          <span key={ep.episode_id} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: COMPARE_COLORS[i] }}
            />
            <span className="max-w-[200px] truncate">
              {ep.episode_number != null && `#${ep.episode_number} `}
              {ep.title}
            </span>
          </span>
        ))}
      </div>

      <svg
        viewBox={`0 0 ${chartW} ${chartH}`}
        className="w-full"
        style={{ maxWidth: chartW }}
      >
        {/* Y-axis grid lines and labels */}
        {yLabels.map((val) => {
          const y = padT + innerH - (val / maxCumulative) * innerH
          return (
            <g key={val}>
              <line
                x1={padL}
                y1={y}
                x2={chartW - padR}
                y2={y}
                stroke="var(--color-border-subtle)"
                strokeWidth="1"
              />
              <text
                x={padL - 6}
                y={y + 3}
                textAnchor="end"
                fontSize="9"
                fill="var(--color-text-tertiary)"
              >
                {formatNumber(val)}
              </text>
            </g>
          )
        })}

        {/* X-axis label */}
        <text
          x={padL + innerW / 2}
          y={chartH - 2}
          textAnchor="middle"
          fontSize="9"
          fill="var(--color-text-tertiary)"
        >
          Days since publish
        </text>

        {/* Episode lines */}
        {episodes.map((ep, i) => {
          if (ep.daily.length < 2) return null
          const points = ep.daily.map((d) => {
            const x = padL + ((d.day - 1) / (maxDays - 1)) * innerW
            const y = padT + innerH - (d.cumulative / maxCumulative) * innerH
            return `${x},${y}`
          }).join(' ')

          return (
            <polyline
              key={ep.episode_id}
              points={points}
              fill="none"
              stroke={COMPARE_COLORS[i]}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )
        })}
      </svg>
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

/* ---------- Utility functions ---------- */

function formatMonth(ym: string): string {
  const [y, m] = ym.split('-')
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[parseInt(m, 10) - 1]} ${y.slice(2)}`
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return n.toLocaleString()
}


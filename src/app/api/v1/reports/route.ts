import { NextRequest } from 'next/server'
import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'
import { createServiceClient } from '@/lib/supabase/server'

function periodToDate(period: string): Date | null {
  const now = new Date()
  switch (period) {
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    case '90d':
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
    case '12m':
      return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
    case 'all':
      return null
    default:
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
  }
}

export async function GET(request: NextRequest) {
  const { org, error } = await getAuthenticatedClient()
  if (error) return error

  const searchParams = request.nextUrl.searchParams
  const period = searchParams.get('period') || '90d'
  const showId = searchParams.get('show_id')
  const since = periodToDate(period)

  const service = createServiceClient()

  const { data: orgShows, error: showsError } = await service
    .from('shows')
    .select('id, name, client_id, clients!inner(id, name, company, org_id)')
    .eq('clients.org_id', org!.id)

  if (showsError) return errorResponse(showsError.message, 500)
  if (!orgShows || orgShows.length === 0) {
    return jsonResponse({
      period,
      episodes: { total: 0, published: 0, in_progress: 0 },
      on_time_rate: null,
      avg_days_to_publish: null,
      deliverables: { total: 0, approved: 0, revision_requested: 0, pending: 0, avg_approval_days: null },
      episodes_by_show: [],
      episodes_by_month: [],
    })
  }

  let showIds = orgShows.map((s) => s.id)
  if (showId) {
    if (!showIds.includes(showId)) return errorResponse('Show not found', 404)
    showIds = [showId]
  }

  const showLookup = new Map(
    orgShows.map((s) => {
      const client = s.clients as unknown as { id: string; name: string; company: string | null }
      return [s.id, { show_name: s.name, client_name: client.company || client.name }]
    })
  )

  let episodeQuery = service
    .from('episodes')
    .select('id, show_id, status, created_at, published_at, scheduled_publish_date')
    .in('show_id', showIds)
    .is('archived_at', null)

  if (since) {
    episodeQuery = episodeQuery.gte('created_at', since.toISOString())
  }

  let deliverableQuery = service
    .from('deliverables')
    .select('id, show_id, status, created_at, reviewed_at')
    .in('show_id', showIds)

  if (since) {
    deliverableQuery = deliverableQuery.gte('created_at', since.toISOString())
  }

  const [{ data: episodes, error: epError }, { data: deliverables, error: delError }] = await Promise.all([
    episodeQuery,
    deliverableQuery,
  ])

  if (epError) return errorResponse(epError.message, 500)
  if (delError) return errorResponse(delError.message, 500)

  const allEpisodes = episodes || []
  const allDeliverables = deliverables || []

  const published = allEpisodes.filter((e) => e.status === 'published')
  const inProgress = allEpisodes.filter((e) => e.status !== 'published')

  // On-time rate
  const withBothDates = allEpisodes.filter((e) => e.published_at && e.scheduled_publish_date)
  const onTime = withBothDates.filter((e) => {
    const pub = new Date(e.published_at!)
    const sched = new Date(e.scheduled_publish_date + 'T23:59:59Z')
    return pub <= sched
  })
  const onTimeRate = withBothDates.length > 0 ? Math.round((onTime.length / withBothDates.length) * 100) / 100 : null

  // Avg days to publish
  const publishedWithCreated = allEpisodes.filter((e) => e.published_at && e.created_at)
  let avgDaysToPublish: number | null = null
  if (publishedWithCreated.length > 0) {
    const totalDays = publishedWithCreated.reduce((sum, e) => {
      const diff = new Date(e.published_at!).getTime() - new Date(e.created_at).getTime()
      return sum + diff / (1000 * 60 * 60 * 24)
    }, 0)
    avgDaysToPublish = Math.round((totalDays / publishedWithCreated.length) * 10) / 10
  }

  // Deliverable stats
  const delApproved = allDeliverables.filter((d) => d.status === 'approved')
  const delRevision = allDeliverables.filter((d) => d.status === 'revision_requested')
  const delPending = allDeliverables.filter((d) => d.status === 'pending')

  const reviewedDeliverables = allDeliverables.filter((d) => d.reviewed_at && d.created_at)
  let avgApprovalDays: number | null = null
  if (reviewedDeliverables.length > 0) {
    const totalDays = reviewedDeliverables.reduce((sum, d) => {
      const diff = new Date(d.reviewed_at!).getTime() - new Date(d.created_at).getTime()
      return sum + diff / (1000 * 60 * 60 * 24)
    }, 0)
    avgApprovalDays = Math.round((totalDays / reviewedDeliverables.length) * 10) / 10
  }

  // Episodes by show
  const byShow = new Map<string, { total: number; published: number }>()
  for (const ep of allEpisodes) {
    const entry = byShow.get(ep.show_id) || { total: 0, published: 0 }
    entry.total++
    if (ep.status === 'published') entry.published++
    byShow.set(ep.show_id, entry)
  }
  const episodesByShow = [...byShow.entries()]
    .map(([sid, counts]) => {
      const info = showLookup.get(sid)
      return {
        show_id: sid,
        show_name: info?.show_name || 'Unknown',
        client_name: info?.client_name || 'Unknown',
        ...counts,
      }
    })
    .sort((a, b) => b.total - a.total)

  // Episodes by month
  const byMonth = new Map<string, { created: number; published: number }>()
  for (const ep of allEpisodes) {
    const month = ep.created_at.slice(0, 7)
    const entry = byMonth.get(month) || { created: 0, published: 0 }
    entry.created++
    byMonth.set(month, entry)
  }
  for (const ep of published) {
    if (!ep.published_at) continue
    const month = ep.published_at.slice(0, 7)
    const entry = byMonth.get(month) || { created: 0, published: 0 }
    entry.published++
    byMonth.set(month, entry)
  }
  const episodesByMonth = [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, counts]) => ({ month, ...counts }))

  return jsonResponse({
    period,
    episodes: {
      total: allEpisodes.length,
      published: published.length,
      in_progress: inProgress.length,
    },
    on_time_rate: onTimeRate,
    avg_days_to_publish: avgDaysToPublish,
    deliverables: {
      total: allDeliverables.length,
      approved: delApproved.length,
      revision_requested: delRevision.length,
      pending: delPending.length,
      avg_approval_days: avgApprovalDays,
    },
    episodes_by_show: episodesByShow,
    episodes_by_month: episodesByMonth,
  })
}

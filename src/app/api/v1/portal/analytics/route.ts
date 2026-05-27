import { NextRequest } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { jsonResponse, errorResponse } from '@/lib/api/helpers'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return errorResponse('Unauthorized', 401)

  const cookieStore = await cookies()
  const previewClientId = cookieStore.get('portal_preview_client_id')?.value
  const service = createServiceClient()

  let clientOrgId: string | null = null
  let clientId: string | null = null
  let showIds: string[] = []

  if (previewClientId) {
    const { data: previewClient } = await service
      .from('clients')
      .select('id, org_id')
      .eq('id', previewClientId)
      .single()

    if (previewClient) {
      const { data: membership } = await service
        .from('memberships')
        .select('id')
        .eq('user_id', user.id)
        .eq('org_id', previewClient.org_id)
        .single()

      if (membership) {
        clientOrgId = previewClient.org_id
        clientId = previewClient.id
      }
    }
  }

  if (!clientId) {
    const { data: client } = await service
      .from('clients')
      .select('id, org_id')
      .eq('client_user_id', user.id)
      .single()

    if (!client) return errorResponse('Forbidden', 403)
    clientOrgId = client.org_id
    clientId = client.id
  }

  const { data: org } = await service
    .from('organizations')
    .select('portal_analytics_enabled')
    .eq('id', clientOrgId!)
    .single()

  if (!org?.portal_analytics_enabled) return errorResponse('Analytics not available', 403)

  const { data: clientShows } = await service
    .from('shows')
    .select('id')
    .eq('client_id', clientId)

  showIds = (clientShows ?? []).map((s) => s.id)
  if (!showIds.length) return jsonResponse({ episodes: [], shows: [] })

  const params = request.nextUrl.searchParams
  const showId = params.get('show_id')
  const period = params.get('period') || '30d'
  const provider = params.get('provider')

  const filterIds = showId && showIds.includes(showId) ? [showId] : showIds
  const since = periodToDate(period)

  let epQuery = service
    .from('episode_analytics')
    .select('episode_id, show_id, provider, date, downloads, plays, listeners, completion_rate, episodes(title, episode_number)')
    .in('show_id', filterIds)
    .order('date', { ascending: false })

  if (provider) epQuery = epQuery.eq('provider', provider)
  if (since) epQuery = epQuery.gte('date', since)

  let showQuery = service
    .from('show_analytics')
    .select('show_id, provider, date, total_downloads, total_plays, followers, shows(name)')
    .in('show_id', filterIds)
    .order('date', { ascending: true })

  if (provider) showQuery = showQuery.eq('provider', provider)
  if (since) showQuery = showQuery.gte('date', since)

  const { data: providerRows } = await service
    .from('episode_analytics')
    .select('provider')
    .in('show_id', filterIds)

  const availableProviders = [...new Set((providerRows ?? []).map((r) => r.provider))].sort()

  const [{ data: epData }, { data: showData }] = await Promise.all([epQuery, showQuery])

  const episodeMap = new Map<string, {
    episode_id: string
    title: string
    episode_number: number | null
    total_downloads: number
    total_plays: number
    daily: { date: string; downloads: number }[]
  }>()

  for (const row of epData ?? []) {
    const ep = row.episodes as unknown as { title: string; episode_number: number | null } | null
    const existing = episodeMap.get(row.episode_id)
    if (existing) {
      existing.total_downloads += row.downloads
      existing.total_plays += row.plays ?? 0
      existing.daily.push({ date: row.date, downloads: row.downloads })
    } else {
      episodeMap.set(row.episode_id, {
        episode_id: row.episode_id,
        title: ep?.title ?? 'Unknown',
        episode_number: ep?.episode_number ?? null,
        total_downloads: row.downloads,
        total_plays: row.plays ?? 0,
        daily: [{ date: row.date, downloads: row.downloads }],
      })
    }
  }

  const episodes = [...episodeMap.values()]
    .map((ep) => ({ ...ep, daily: ep.daily.sort((a, b) => a.date.localeCompare(b.date)) }))
    .sort((a, b) => b.total_downloads - a.total_downloads)

  const showTrends: { date: string; downloads: number; plays: number | null; followers: number | null }[] = []
  for (const row of showData ?? []) {
    showTrends.push({
      date: row.date,
      downloads: row.total_downloads,
      plays: row.total_plays,
      followers: row.followers,
    })
  }

  const totalDownloads = episodes.reduce((sum, e) => sum + e.total_downloads, 0)
  const avgDownloads = episodes.length > 0 ? Math.round(totalDownloads / episodes.length) : 0
  const latestFollowers = showTrends.length > 0 ? showTrends[showTrends.length - 1].followers : null

  return jsonResponse({
    summary: { total_downloads: totalDownloads, avg_downloads: avgDownloads, followers: latestFollowers },
    providers: availableProviders,
    episodes,
    trends: showTrends,
  })
}

function periodToDate(period: string): string | null {
  const now = new Date()
  switch (period) {
    case '30d': return new Date(now.getTime() - 30 * 86400000).toISOString().slice(0, 10)
    case '90d': return new Date(now.getTime() - 90 * 86400000).toISOString().slice(0, 10)
    case '12m': return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()).toISOString().slice(0, 10)
    case 'all': return null
    default: return new Date(now.getTime() - 30 * 86400000).toISOString().slice(0, 10)
  }
}

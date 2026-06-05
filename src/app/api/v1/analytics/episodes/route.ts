import { NextRequest } from 'next/server'
import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'
import { createServiceClient } from '@/lib/supabase/server'
import { getOrgEntitlements } from '@/lib/entitlements'

export async function GET(request: NextRequest) {
  const { org, error } = await getAuthenticatedClient()
  if (error) return error

  const entitlements = await getOrgEntitlements(org!.id, org!.planId, org!.trialEndsAt)
  if (!entitlements.can('analytics')) return errorResponse('Upgrade to Studio for audience analytics', 403)

  const params = request.nextUrl.searchParams
  const showId = params.get('show_id')
  const provider = params.get('provider')
  const period = params.get('period') || '30d'

  const since = periodToDate(period)
  const service = createServiceClient()

  let query = service
    .from('episode_analytics')
    .select('episode_id, show_id, provider, date, downloads, plays, listeners, avg_listen_duration_seconds, completion_rate, episodes(title, episode_number)')
    .eq('org_id', org!.id)
    .order('date', { ascending: false })

  if (showId) query = query.eq('show_id', showId)
  if (provider) query = query.eq('provider', provider)
  if (since) query = query.gte('date', since)

  const { data, error: dbError } = await query

  if (dbError) return errorResponse(dbError.message, 500)

  const episodeMap = new Map<string, {
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
  }>()

  for (const row of data ?? []) {
    const ep = row.episodes as unknown as { title: string; episode_number: number | null } | null
    const key = `${row.episode_id}:${provider || 'all'}`
    const existing = episodeMap.get(key)

    if (existing) {
      existing.total_downloads += row.downloads
      existing.total_plays += row.plays ?? 0
      existing.total_listeners += row.listeners ?? 0
      existing.daily.push({ date: row.date, downloads: row.downloads, plays: row.plays })
      if (!existing.providers.includes(row.provider)) existing.providers.push(row.provider)
      if (row.completion_rate != null) {
        existing.avg_completion_rate = existing.avg_completion_rate != null
          ? (existing.avg_completion_rate + Number(row.completion_rate)) / 2
          : Number(row.completion_rate)
      }
    } else {
      episodeMap.set(key, {
        episode_id: row.episode_id,
        show_id: row.show_id,
        title: ep?.title ?? 'Unknown',
        episode_number: ep?.episode_number ?? null,
        total_downloads: row.downloads,
        total_plays: row.plays ?? 0,
        total_listeners: row.listeners ?? 0,
        avg_completion_rate: row.completion_rate != null ? Number(row.completion_rate) : null,
        daily: [{ date: row.date, downloads: row.downloads, plays: row.plays }],
        providers: [row.provider],
      })
    }
  }

  const episodes = [...episodeMap.values()]
    .map((ep) => ({
      ...ep,
      daily: ep.daily.sort((a, b) => a.date.localeCompare(b.date)),
    }))
    .sort((a, b) => b.total_downloads - a.total_downloads)

  return jsonResponse(episodes)
}

function periodToDate(period: string): string | null {
  const now = new Date()
  switch (period) {
    case '7d':
      return new Date(now.getTime() - 7 * 86400000).toISOString().slice(0, 10)
    case '30d':
      return new Date(now.getTime() - 30 * 86400000).toISOString().slice(0, 10)
    case '90d':
      return new Date(now.getTime() - 90 * 86400000).toISOString().slice(0, 10)
    case '12m':
      return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()).toISOString().slice(0, 10)
    case 'all':
      return new Date(now.getTime() - 730 * 86400000).toISOString().slice(0, 10)
    default:
      return new Date(now.getTime() - 30 * 86400000).toISOString().slice(0, 10)
  }
}

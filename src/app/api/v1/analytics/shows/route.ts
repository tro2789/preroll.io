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
    .from('show_analytics')
    .select('show_id, provider, date, followers, new_followers, total_downloads, total_plays, top_countries, top_devices, top_apps, shows(name)')
    .eq('org_id', org!.id)
    .order('date', { ascending: true })

  if (showId) query = query.eq('show_id', showId)
  if (provider) query = query.eq('provider', provider)
  if (since) query = query.gte('date', since)

  const { data, error: dbError } = await query

  if (dbError) return errorResponse(dbError.message, 500)

  const showMap = new Map<string, {
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
  }>()

  for (const row of data ?? []) {
    const show = row.shows as unknown as { name: string } | null
    const key = row.show_id
    const existing = showMap.get(key)

    if (existing) {
      existing.total_downloads += row.total_downloads
      existing.total_plays += row.total_plays ?? 0
      existing.total_new_followers += row.new_followers ?? 0
      existing.latest_followers = row.followers ?? existing.latest_followers
      existing.latest_top_countries = row.top_countries ?? existing.latest_top_countries
      existing.latest_top_devices = row.top_devices ?? existing.latest_top_devices
      existing.latest_top_apps = row.top_apps ?? existing.latest_top_apps
      existing.daily.push({ date: row.date, downloads: row.total_downloads, plays: row.total_plays, followers: row.followers })
      if (!existing.providers.includes(row.provider)) existing.providers.push(row.provider)
    } else {
      showMap.set(key, {
        show_id: row.show_id,
        show_name: show?.name ?? 'Unknown',
        latest_followers: row.followers,
        total_downloads: row.total_downloads,
        total_plays: row.total_plays ?? 0,
        total_new_followers: row.new_followers ?? 0,
        latest_top_countries: row.top_countries,
        latest_top_devices: row.top_devices,
        latest_top_apps: row.top_apps,
        daily: [{ date: row.date, downloads: row.total_downloads, plays: row.total_plays, followers: row.followers }],
        providers: [row.provider],
      })
    }
  }

  return jsonResponse([...showMap.values()])
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
      return null
    default:
      return new Date(now.getTime() - 30 * 86400000).toISOString().slice(0, 10)
  }
}

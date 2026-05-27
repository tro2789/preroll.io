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
  const episodeIds = params.get('episode_ids')?.split(',').filter(Boolean)

  if (!episodeIds?.length || episodeIds.length > 4) {
    return errorResponse('Provide 2-4 episode_ids separated by commas')
  }

  const service = createServiceClient()

  const { data, error: dbError } = await service
    .from('episode_analytics')
    .select('episode_id, date, downloads, plays, episodes(title, episode_number, created_at)')
    .eq('org_id', org!.id)
    .in('episode_id', episodeIds)
    .order('date', { ascending: true })

  if (dbError) return errorResponse(dbError.message, 500)

  const episodeData = new Map<string, {
    episode_id: string
    title: string
    episode_number: number | null
    published_at: string | null
    daily: { day: number; date: string; downloads: number; cumulative: number }[]
  }>()

  for (const row of data ?? []) {
    const ep = row.episodes as unknown as { title: string; episode_number: number | null; created_at: string } | null
    if (!episodeData.has(row.episode_id)) {
      episodeData.set(row.episode_id, {
        episode_id: row.episode_id,
        title: ep?.title ?? 'Unknown',
        episode_number: ep?.episode_number ?? null,
        published_at: ep?.created_at ?? null,
        daily: [],
      })
    }
    episodeData.get(row.episode_id)!.daily.push({
      day: 0,
      date: row.date,
      downloads: row.downloads,
      cumulative: 0,
    })
  }

  const result = [...episodeData.values()].map((ep) => {
    ep.daily.sort((a, b) => a.date.localeCompare(b.date))
    let cumulative = 0
    ep.daily.forEach((d, i) => {
      d.day = i + 1
      cumulative += d.downloads
      d.cumulative = cumulative
    })
    return ep
  })

  return jsonResponse(result)
}

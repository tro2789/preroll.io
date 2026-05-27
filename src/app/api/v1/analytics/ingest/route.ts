import { NextRequest } from 'next/server'
import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'
import { createServiceClient } from '@/lib/supabase/server'
import { getOrgEntitlements } from '@/lib/entitlements'
import { dispatchWebhooks } from '@/lib/webhooks/dispatch'

interface EpisodeSnapshot {
  episode_id: string
  date: string
  downloads: number
  plays?: number | null
  listeners?: number | null
  avg_listen_duration_seconds?: number | null
  completion_rate?: number | null
}

interface ShowSnapshot {
  date: string
  followers?: number | null
  new_followers?: number | null
  total_downloads: number
  total_plays?: number | null
  top_countries?: unknown | null
  top_devices?: unknown | null
  top_apps?: unknown | null
}

interface IngestPayload {
  show_id: string
  provider: string
  episodes?: EpisodeSnapshot[]
  show_stats?: ShowSnapshot
}

export async function POST(request: NextRequest) {
  const { org, error } = await getAuthenticatedClient()
  if (error) return error

  const entitlements = await getOrgEntitlements(org!.id, org!.planId, org!.trialEndsAt)
  if (!entitlements.can('analytics')) return errorResponse('Upgrade to Studio for audience analytics', 403)

  const body = (await request.json()) as IngestPayload
  const { show_id, provider, episodes, show_stats } = body

  if (!show_id || !provider) return errorResponse('show_id and provider are required')

  const service = createServiceClient()

  const { data: connection } = await service
    .from('analytics_connections')
    .select('id')
    .eq('show_id', show_id)
    .eq('provider', provider)
    .eq('org_id', org!.id)
    .single()

  if (!connection) return errorResponse('No active analytics connection found for this show/provider', 404)

  const { data: show } = await service
    .from('shows')
    .select('id, analytics_milestones')
    .eq('id', show_id)
    .single()

  let episodesInserted = 0
  let showStatsInserted = 0

  if (episodes?.length) {
    const suppliedIds = [...new Set(episodes.map((e) => e.episode_id))]
    const { data: validEpisodes } = await service
      .from('episodes')
      .select('id')
      .eq('show_id', show_id)
      .in('id', suppliedIds)

    const validSet = new Set((validEpisodes ?? []).map((e) => e.id))
    const invalidIds = suppliedIds.filter((id) => !validSet.has(id))
    if (invalidIds.length > 0) {
      return errorResponse(`episode_id(s) do not belong to this show: ${invalidIds.join(', ')}`, 400)
    }

    const rows = episodes.map((ep) => ({
      episode_id: ep.episode_id,
      show_id,
      org_id: org!.id,
      provider,
      date: ep.date,
      downloads: ep.downloads,
      plays: ep.plays ?? null,
      listeners: ep.listeners ?? null,
      avg_listen_duration_seconds: ep.avg_listen_duration_seconds ?? null,
      completion_rate: ep.completion_rate ?? null,
    }))

    const { error: insertError, count } = await service
      .from('episode_analytics')
      .upsert(rows, { onConflict: 'episode_id,provider,date', count: 'exact' })

    if (insertError) return errorResponse(insertError.message, 500)
    episodesInserted = count ?? rows.length

    if (show?.analytics_milestones) {
      await checkMilestones(service, org!.id, show_id, show.analytics_milestones, episodes)
    }
  }

  if (show_stats) {
    const { error: insertError } = await service
      .from('show_analytics')
      .upsert({
        show_id,
        org_id: org!.id,
        provider,
        date: show_stats.date,
        followers: show_stats.followers ?? null,
        new_followers: show_stats.new_followers ?? null,
        total_downloads: show_stats.total_downloads,
        total_plays: show_stats.total_plays ?? null,
        top_countries: show_stats.top_countries ?? null,
        top_devices: show_stats.top_devices ?? null,
        top_apps: show_stats.top_apps ?? null,
      }, { onConflict: 'show_id,provider,date' })

    if (insertError) return errorResponse(insertError.message, 500)
    showStatsInserted = 1
  }

  await service
    .from('analytics_connections')
    .update({ last_synced_at: new Date().toISOString(), sync_status: 'active', sync_error: null })
    .eq('id', connection.id)

  return jsonResponse({ episodes_inserted: episodesInserted, show_stats_inserted: showStatsInserted })
}

async function checkMilestones(
  service: ReturnType<typeof createServiceClient>,
  orgId: string,
  showId: string,
  milestones: unknown,
  episodes: EpisodeSnapshot[]
) {
  if (!Array.isArray(milestones)) return

  const thresholds = milestones
    .filter((m): m is { downloads: number } => typeof m === 'object' && m !== null && typeof (m as { downloads?: unknown }).downloads === 'number')
    .map((m) => m.downloads)
    .sort((a, b) => a - b)

  if (!thresholds.length) return

  const episodeIds = [...new Set(episodes.map((e) => e.episode_id))]

  const { data: totals } = await service
    .from('episode_analytics')
    .select('episode_id, downloads')
    .in('episode_id', episodeIds)

  if (!totals?.length) return

  const downloadsByEpisode = new Map<string, number>()
  for (const row of totals) {
    downloadsByEpisode.set(row.episode_id, (downloadsByEpisode.get(row.episode_id) ?? 0) + row.downloads)
  }

  for (const [episodeId, totalDownloads] of downloadsByEpisode) {
    for (const threshold of thresholds) {
      if (totalDownloads >= threshold) {
        const todayDownloads = episodes.find((e) => e.episode_id === episodeId)?.downloads ?? 0
        const previousTotal = totalDownloads - todayDownloads
        if (previousTotal < threshold) {
          dispatchWebhooks(orgId, 'episode.milestone_reached', {
            show_id: showId,
            episode_id: episodeId,
            milestone: threshold,
            total_downloads: totalDownloads,
          })
        }
      }
    }
  }
}

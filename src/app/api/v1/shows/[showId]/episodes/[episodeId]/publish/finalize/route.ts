import { NextRequest } from 'next/server'
import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'
import { dispatchWebhooks } from '@/lib/webhooks/dispatch'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ showId: string; episodeId: string }> }
) {
  const { showId, episodeId } = await params
  const { supabase, org, error } = await getAuthenticatedClient()
  if (error) return error

  const body = await request.json()
  const { video_id, title, privacy_status, scheduled_at, channel_id } = body

  if (!video_id) return errorResponse('video_id is required', 400)

  const viewUrl = `https://youtube.com/watch?v=${video_id}`
  const status = scheduled_at ? 'scheduled' : 'published'

  await Promise.all([
    supabase!
      .from('episodes')
      .update({
        distribution_status: status,
        distribution_external_id: video_id,
        distribution_published_at: scheduled_at || new Date().toISOString(),
        distribution_metadata: {
          provider: 'youtube',
          youtube_video_id: video_id,
          view_url: viewUrl,
          privacy_status,
          channel_id,
        },
      })
      .eq('id', episodeId),
    supabase!.from('activity_log').insert({
      show_id: showId,
      episode_id: episodeId,
      action: scheduled_at ? 'episode_scheduled' : 'episode_published',
      description: scheduled_at
        ? `Episode '${title}' scheduled on YouTube for ${scheduled_at}`
        : `Episode '${title}' published to YouTube`,
      metadata: { youtube_video_id: video_id },
    }),
  ])

  dispatchWebhooks(org!.id, scheduled_at ? 'episode.scheduled' : 'episode.published', {
    episode_id: episodeId,
    show_id: showId,
    title,
    provider: 'youtube',
    youtube_video_id: video_id,
    view_url: viewUrl,
    scheduled_at: scheduled_at || null,
  })

  return jsonResponse({
    provider: 'youtube',
    youtube_video_id: video_id,
    status,
    view_url: viewUrl,
  }, 201)
}

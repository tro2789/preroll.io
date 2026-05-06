import { NextRequest } from 'next/server'
import { getAuthenticatedClient, jsonResponse, errorResponse, getNextPositionInStage } from '@/lib/api/helpers'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ showId: string }> }
) {
  const { showId } = await params
  const { supabase, error } = await getAuthenticatedClient()
  if (error) return error

  const body = await request.json()
  const { episodeIds, stageId } = body

  if (!Array.isArray(episodeIds) || episodeIds.length === 0) {
    return errorResponse('episodeIds must be a non-empty array')
  }
  if (!stageId) return errorResponse('stageId is required')

  const { data: stage } = await supabase!
    .from('pipeline_stages')
    .select('name, status_override')
    .eq('id', stageId)
    .single()

  if (!stage) return errorResponse('Stage not found', 404)

  const nextPosition = await getNextPositionInStage(supabase!, stageId)

  const updateData: Record<string, unknown> = { stage_id: stageId }
  if (stage.status_override) {
    updateData.status = stage.status_override
  }

  const updates = await Promise.all(
    episodeIds.map((episodeId: string, i: number) =>
      supabase!
        .from('episodes')
        .update({ ...updateData, position: nextPosition + i })
        .eq('id', episodeId)
        .eq('show_id', showId)
        .select()
        .single()
    )
  )

  const results = updates.filter((r) => !r.error && r.data).map((r) => r.data!)

  if (results.length > 0) {
    await supabase!.from('activity_log').insert(
      results.map((data) => ({
        show_id: showId,
        episode_id: data.id,
        action: 'episode_stage_changed',
        description: `Episode '${data.title}' moved to ${stage.name} (bulk)`,
        metadata: { stage_id: stageId, stage_name: stage.name, bulk: true },
      }))
    )
  }

  return jsonResponse(results)
}

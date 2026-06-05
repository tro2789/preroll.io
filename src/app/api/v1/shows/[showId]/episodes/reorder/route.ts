import { NextRequest } from 'next/server'
import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'
import { getShowForOrg } from '@/lib/api/ownership'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ showId: string }> }
) {
  const { showId } = await params
  const { supabase, org, error } = await getAuthenticatedClient()
  if (error) return error
  if (!(await getShowForOrg(supabase!, showId, org!.id))) return errorResponse('Show not found', 404)

  const body = await request.json()
  const { episodeId, stageId, position } = body

  if (!episodeId || !stageId || position == null) {
    return errorResponse('episodeId, stageId, and position are required')
  }

  const { data: episode } = await supabase!
    .from('episodes')
    .select('id, stage_id, position')
    .eq('id', episodeId)
    .eq('show_id', showId)
    .single()

  if (!episode) return errorResponse('Episode not found', 404)

  const { data: destStage } = await supabase!
    .from('pipeline_stages')
    .select('id')
    .eq('id', stageId)
    .eq('show_id', showId)
    .single()

  if (!destStage) return errorResponse('Stage not found', 404)

  const movingWithinSameStage = episode.stage_id === stageId

  if (movingWithinSameStage) {
    const oldPos = episode.position
    if (oldPos === position) return jsonResponse({ success: true })

    if (position < oldPos) {
      await supabase!.rpc('shift_episode_positions_down', {
        p_stage_id: stageId,
        p_from: position,
        p_to: oldPos - 1,
      })
    } else {
      await supabase!.rpc('shift_episode_positions_up', {
        p_stage_id: stageId,
        p_from: oldPos + 1,
        p_to: position,
      })
    }
  } else {
    await supabase!.rpc('shift_episode_positions_up', {
      p_stage_id: episode.stage_id,
      p_from: episode.position + 1,
      p_to: 999999,
    })

    await supabase!.rpc('shift_episode_positions_down', {
      p_stage_id: stageId,
      p_from: position,
      p_to: 999999,
    })
  }

  const updateData: Record<string, unknown> = { position, stage_id: stageId }
  let stageName: string | null = null

  if (!movingWithinSameStage) {
    const { data: stage } = await supabase!
      .from('pipeline_stages')
      .select('name, status_override')
      .eq('id', stageId)
      .eq('show_id', showId)
      .single()

    if (stage) {
      stageName = stage.name
      if (stage.status_override) {
        updateData['status'] = stage.status_override
      }
    }
  }

  const { data: updated, error: updateError } = await supabase!
    .from('episodes')
    .update(updateData)
    .eq('id', episodeId)
    .select('*, pipeline_stages(id, name, position)')
    .single()

  if (updateError) return errorResponse(updateError.message, 500)

  if (stageName) {
    await supabase!.from('activity_log').insert({
      show_id: showId,
      episode_id: episodeId,
      action: 'episode_stage_changed',
      description: `Episode '${updated.title}' moved to ${stageName}`,
      metadata: { stage_id: stageId, stage_name: stageName },
    })
  }

  return jsonResponse(updated)
}

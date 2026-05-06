import { NextRequest } from 'next/server'
import { getAuthenticatedClient, jsonResponse, errorResponse, getNextPositionInStage } from '@/lib/api/helpers'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ showId: string; episodeId: string }> }
) {
  const { showId, episodeId } = await params
  const { supabase, error } = await getAuthenticatedClient()
  if (error) return error

  const { data, error: dbError } = await supabase!
    .from('episodes')
    .select('*, pipeline_stages(id, name, position)')
    .eq('id', episodeId)
    .eq('show_id', showId)
    .single()

  if (dbError) return errorResponse('Episode not found', 404)
  return jsonResponse(data)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ showId: string; episodeId: string }> }
) {
  const { showId, episodeId } = await params
  const { supabase, error } = await getAuthenticatedClient()
  if (error) return error

  const body = await request.json()
  const allowedFields = [
    'title', 'episode_number', 'description', 'stage_id',
    'status', 'scheduled_publish_date', 'frame_io_url',
    'transistor_episode_id', 'notes', 'published_at', 'image_url',
    'position',
  ]
  const updateData: Record<string, unknown> = {}
  for (const field of allowedFields) {
    if (field in body) {
      updateData[field] = body[field]
    }
  }

  let newStageName: string | null = null
  if ('stage_id' in body && body.stage_id) {
    const { data: stage } = await supabase!
      .from('pipeline_stages')
      .select('name, status_override')
      .eq('id', body.stage_id)
      .single()

    if (stage) {
      newStageName = stage.name
      if (stage.status_override) {
        updateData['status'] = stage.status_override
      }

      if (!('position' in body)) {
        updateData['position'] = await getNextPositionInStage(supabase!, body.stage_id)
      }
    }
  }

  const { data, error: dbError } = await supabase!
    .from('episodes')
    .update(updateData)
    .eq('id', episodeId)
    .eq('show_id', showId)
    .select('*, pipeline_stages(id, name, position)')
    .single()

  if (dbError) return errorResponse(dbError.message, 500)

  if (newStageName) {
    await supabase!.from('activity_log').insert({
      show_id: showId,
      episode_id: episodeId,
      action: 'episode_stage_changed',
      description: `Episode '${data.title}' moved to ${newStageName}`,
      metadata: { stage_id: body.stage_id, stage_name: newStageName },
    })
  }

  return jsonResponse(data)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ showId: string; episodeId: string }> }
) {
  const { showId, episodeId } = await params
  const { supabase, error } = await getAuthenticatedClient()
  if (error) return error

  const { error: dbError } = await supabase!
    .from('episodes')
    .delete()
    .eq('id', episodeId)
    .eq('show_id', showId)

  if (dbError) return errorResponse(dbError.message, 500)
  return new Response(null, { status: 204 })
}


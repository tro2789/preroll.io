import { NextRequest } from 'next/server'
import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'
import { getShowForOrg } from '@/lib/api/ownership'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ showId: string; stageId: string }> }
) {
  const { showId, stageId } = await params
  const { supabase, org, error } = await getAuthenticatedClient()
  if (error) return error
  if (!(await getShowForOrg(supabase!, showId, org!.id))) return errorResponse('Show not found', 404)

  const body = await request.json()
  const allowedFields = ['name', 'position', 'status_override', 'wip_limit']
  const updateData: Record<string, unknown> = {}
  for (const field of allowedFields) {
    if (field in body) {
      updateData[field] = body[field]
    }
  }

  if (Object.keys(updateData).length === 0) {
    return errorResponse('No valid fields to update')
  }

  const { data, error: dbError } = await supabase!
    .from('pipeline_stages')
    .update(updateData)
    .eq('id', stageId)
    .eq('show_id', showId)
    .select()
    .single()

  if (dbError) return errorResponse(dbError.message, 500)
  if (!data) return errorResponse('Stage not found', 404)
  return jsonResponse(data)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ showId: string; stageId: string }> }
) {
  const { showId, stageId } = await params
  const { supabase, org, error } = await getAuthenticatedClient()
  if (error) return error
  if (!(await getShowForOrg(supabase!, showId, org!.id))) return errorResponse('Show not found', 404)

  const { data: episodes } = await supabase!
    .from('episodes')
    .select('id')
    .eq('stage_id', stageId)
    .eq('show_id', showId)
    .limit(1)

  if (episodes && episodes.length > 0) {
    return errorResponse('Cannot delete a stage that has episodes. Move them first.', 409)
  }

  const { error: dbError } = await supabase!
    .from('pipeline_stages')
    .delete()
    .eq('id', stageId)
    .eq('show_id', showId)

  if (dbError) return errorResponse(dbError.message, 500)
  return new Response(null, { status: 204 })
}

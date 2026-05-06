import { NextRequest } from 'next/server'
import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ showId: string }> }
) {
  const { showId } = await params
  const { supabase, error } = await getAuthenticatedClient()
  if (error) return error

  const { data, error: dbError } = await supabase!
    .from('pipeline_stages')
    .select('*')
    .eq('show_id', showId)
    .order('position')

  if (dbError) return errorResponse(dbError.message, 500)
  return jsonResponse(data)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ showId: string }> }
) {
  const { showId } = await params
  const { supabase, error } = await getAuthenticatedClient()
  if (error) return error

  const body = await request.json()
  if (!Array.isArray(body)) return errorResponse('Request body must be an array of stages')

  for (const stage of body) {
    if (!stage.name || stage.position == null) {
      return errorResponse('Each stage must have a name and position')
    }
  }

  const { data: existing } = await supabase!
    .from('pipeline_stages')
    .select('id')
    .eq('show_id', showId)

  const existingIds = new Set((existing || []).map((s) => s.id))
  const incomingIds = new Set(body.filter((s: { id?: string }) => s.id).map((s: { id: string }) => s.id))
  const toDelete = [...existingIds].filter((id) => !incomingIds.has(id))

  if (toDelete.length > 0) {
    const { data: orphaned } = await supabase!
      .from('episodes')
      .select('id')
      .in('stage_id', toDelete)
      .limit(1)

    if (orphaned && orphaned.length > 0) {
      return errorResponse('Cannot delete stages that have episodes. Move episodes first.', 409)
    }

    await supabase!
      .from('pipeline_stages')
      .delete()
      .in('id', toDelete)
  }

  const toUpdate = body.filter((s: { id?: string }) => s.id && existingIds.has(s.id))
  const toInsert = body.filter((s: { id?: string }) => !s.id || !existingIds.has(s.id))

  if (toUpdate.length > 0) {
    await Promise.all(
      toUpdate.map((stage: { id: string; name: string; position: number; status_override?: string; wip_limit?: number }) =>
        supabase!
          .from('pipeline_stages')
          .update({
            name: stage.name,
            position: stage.position,
            status_override: stage.status_override ?? null,
            wip_limit: stage.wip_limit ?? null,
          })
          .eq('id', stage.id)
      )
    )
  }

  if (toInsert.length > 0) {
    await supabase!
      .from('pipeline_stages')
      .insert(
        toInsert.map((stage: { name: string; position: number; status_override?: string; wip_limit?: number }) => ({
          show_id: showId,
          name: stage.name,
          position: stage.position,
          status_override: stage.status_override ?? null,
          wip_limit: stage.wip_limit ?? null,
        }))
      )
  }

  const { data, error: fetchError } = await supabase!
    .from('pipeline_stages')
    .select('*')
    .eq('show_id', showId)
    .order('position')

  if (fetchError) return errorResponse(fetchError.message, 500)
  return jsonResponse(data)
}

import { NextRequest } from 'next/server'
import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'
import { requireRole } from '@/lib/org/roles'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ showId: string }> }
) {
  const { showId } = await params
  const { supabase, error } = await getAuthenticatedClient()
  if (error) return error

  const { data: show, error: showError } = await supabase!
    .from('shows')
    .select('*, pipeline_stages(*)')
    .eq('id', showId)
    .order('position', { referencedTable: 'pipeline_stages' })
    .single()

  if (showError) return errorResponse('Show not found', 404)

  const { data: episodeCounts, error: episodesError } = await supabase!
    .from('episodes')
    .select('stage_id')
    .eq('show_id', showId)

  if (episodesError) return errorResponse(episodesError.message, 500)

  const countsMap: Record<string, number> = {}
  if (episodeCounts) {
    for (const ep of episodeCounts) {
      if (ep.stage_id) {
        countsMap[ep.stage_id] = (countsMap[ep.stage_id] || 0) + 1
      }
    }
  }

  const stagesWithCounts = show.pipeline_stages.map((stage: { id: string }) => ({
    ...stage,
    episode_count: countsMap[stage.id] || 0,
  }))

  return jsonResponse({ ...show, pipeline_stages: stagesWithCounts })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ showId: string }> }
) {
  const { showId } = await params
  const { supabase, error } = await getAuthenticatedClient()
  if (error) return error

  const body = await request.json()
  const allowedFields = ['name', 'description', 'format', 'schedule', 'cover_art_url', 'episode_template', 'allow_client_downloads', 'ai_auto_transcribe', 'ai_auto_generate']
  const updateData: Record<string, unknown> = {}
  for (const field of allowedFields) {
    if (field in body) {
      updateData[field] = body[field]
    }
  }

  const { data, error: dbError } = await supabase!
    .from('shows')
    .update(updateData)
    .eq('id', showId)
    .select()
    .single()

  if (dbError) return errorResponse(dbError.message, 500)
  return jsonResponse(data)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ showId: string }> }
) {
  const { showId } = await params
  const { supabase, org, error } = await getAuthenticatedClient()
  if (error) return error

  const roleError = requireRole(org!, 'admin')
  if (roleError) return roleError

  const { error: dbError } = await supabase!
    .from('shows')
    .delete()
    .eq('id', showId)

  if (dbError) return errorResponse(dbError.message, 500)
  return new Response(null, { status: 204 })
}

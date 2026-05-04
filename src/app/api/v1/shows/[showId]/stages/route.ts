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

  // Delete all existing stages for this show
  const { error: deleteError } = await supabase!
    .from('pipeline_stages')
    .delete()
    .eq('show_id', showId)

  if (deleteError) return errorResponse(deleteError.message, 500)

  // Insert the new stages
  const newStages = body.map((stage: { name: string; position: number }) => ({
    show_id: showId,
    name: stage.name,
    position: stage.position,
  }))

  const { data, error: insertError } = await supabase!
    .from('pipeline_stages')
    .insert(newStages)
    .select()
    .order('position')

  if (insertError) return errorResponse(insertError.message, 500)
  return jsonResponse(data)
}

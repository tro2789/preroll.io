import { NextRequest } from 'next/server'
import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string; noteId: string }> }
) {
  const { clientId, noteId } = await params
  const { supabase, error } = await getAuthenticatedClient()
  if (error) return error

  const { data, error: dbError } = await supabase!
    .from('meeting_notes')
    .select('*')
    .eq('id', noteId)
    .eq('client_id', clientId)
    .single()

  if (dbError) return errorResponse('Note not found', 404)
  return jsonResponse(data)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string; noteId: string }> }
) {
  const { clientId, noteId } = await params
  const { supabase, error } = await getAuthenticatedClient()
  if (error) return error

  const body = await request.json()

  const updates: Record<string, unknown> = {}
  if (body.title !== undefined) updates.title = body.title
  if (body.content !== undefined) updates.content = body.content
  if (body.meeting_date !== undefined) updates.meeting_date = body.meeting_date

  if (Object.keys(updates).length === 0) {
    return errorResponse('No valid fields to update', 400)
  }

  const { data, error: dbError } = await supabase!
    .from('meeting_notes')
    .update(updates)
    .eq('id', noteId)
    .eq('client_id', clientId)
    .select()
    .single()

  if (dbError) return errorResponse(dbError.message, 500)
  return jsonResponse(data)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string; noteId: string }> }
) {
  const { clientId, noteId } = await params
  const { supabase, error } = await getAuthenticatedClient()
  if (error) return error

  const { error: dbError } = await supabase!
    .from('meeting_notes')
    .delete()
    .eq('id', noteId)
    .eq('client_id', clientId)

  if (dbError) return errorResponse(dbError.message, 500)
  return new Response(null, { status: 204 })
}

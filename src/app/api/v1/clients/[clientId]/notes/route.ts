import { NextRequest } from 'next/server'
import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params
  const { supabase, error } = await getAuthenticatedClient()
  if (error) return error

  const { data, error: dbError, count } = await supabase!
    .from('meeting_notes')
    .select('*', { count: 'exact' })
    .eq('client_id', clientId)
    .order('meeting_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (dbError) return errorResponse(dbError.message, 500)
  return jsonResponse({ notes: data, count })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params
  const { supabase, error } = await getAuthenticatedClient()
  if (error) return error

  const body = await request.json()

  if (!body.content) {
    return errorResponse('content is required', 400)
  }

  const insert: Record<string, unknown> = {
    client_id: clientId,
    content: body.content,
  }

  if (body.title !== undefined) insert.title = body.title
  if (body.meeting_date !== undefined) insert.meeting_date = body.meeting_date

  const { data, error: dbError } = await supabase!
    .from('meeting_notes')
    .insert(insert)
    .select()
    .single()

  if (dbError) return errorResponse(dbError.message, 500)
  return jsonResponse(data, 201)
}

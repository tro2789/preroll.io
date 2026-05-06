import { NextRequest } from 'next/server'
import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tagId: string }> }
) {
  const { tagId } = await params
  const { supabase, error } = await getAuthenticatedClient()
  if (error) return error

  const body = await request.json()
  const updateData: Record<string, unknown> = {}
  if (body.name != null) updateData.name = body.name.trim()
  if (body.color != null) updateData.color = body.color

  if (Object.keys(updateData).length === 0) {
    return errorResponse('No valid fields to update')
  }

  const { data, error: dbError } = await supabase!
    .from('tags')
    .update(updateData)
    .eq('id', tagId)
    .select()
    .single()

  if (dbError) return errorResponse(dbError.message, 500)
  return jsonResponse(data)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ tagId: string }> }
) {
  const { tagId } = await params
  const { supabase, error } = await getAuthenticatedClient()
  if (error) return error

  const { error: dbError } = await supabase!
    .from('tags')
    .delete()
    .eq('id', tagId)

  if (dbError) return errorResponse(dbError.message, 500)
  return new Response(null, { status: 204 })
}

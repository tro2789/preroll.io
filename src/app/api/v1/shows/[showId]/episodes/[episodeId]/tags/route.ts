import { NextRequest } from 'next/server'
import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ showId: string; episodeId: string }> }
) {
  const { episodeId } = await params
  const { supabase, error } = await getAuthenticatedClient()
  if (error) return error

  const { data, error: dbError } = await supabase!
    .from('episode_tags')
    .select('tag_id, tags(id, name, color)')
    .eq('episode_id', episodeId)

  if (dbError) return errorResponse(dbError.message, 500)
  return jsonResponse(data?.map((et) => et.tags) ?? [])
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ showId: string; episodeId: string }> }
) {
  const { episodeId } = await params
  const { supabase, error } = await getAuthenticatedClient()
  if (error) return error

  const body = await request.json()
  const tagIds: string[] = body.tagIds
  if (!Array.isArray(tagIds)) return errorResponse('tagIds must be an array')

  await supabase!
    .from('episode_tags')
    .delete()
    .eq('episode_id', episodeId)

  if (tagIds.length > 0) {
    const rows = tagIds.map((tagId) => ({ episode_id: episodeId, tag_id: tagId }))
    const { error: insertError } = await supabase!
      .from('episode_tags')
      .insert(rows)

    if (insertError) return errorResponse(insertError.message, 500)
  }

  const { data } = await supabase!
    .from('episode_tags')
    .select('tag_id, tags(id, name, color)')
    .eq('episode_id', episodeId)

  return jsonResponse(data?.map((et) => et.tags) ?? [])
}

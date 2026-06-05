import { NextRequest } from 'next/server'
import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'
import { getEpisodeForShowAndOrg } from '@/lib/api/ownership'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ showId: string; episodeId: string }> }
) {
  const { showId, episodeId } = await params
  const { supabase, org, error } = await getAuthenticatedClient()
  if (error) return error
  if (!(await getEpisodeForShowAndOrg(supabase!, episodeId, showId, org!.id))) return errorResponse('Episode not found', 404)

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
  const { showId, episodeId } = await params
  const { supabase, org, error } = await getAuthenticatedClient()
  if (error) return error
  if (!(await getEpisodeForShowAndOrg(supabase!, episodeId, showId, org!.id))) return errorResponse('Episode not found', 404)

  const body = await request.json()
  const tagIds: string[] = body.tagIds
  if (!Array.isArray(tagIds)) return errorResponse('tagIds must be an array')

  if (tagIds.length > 0) {
    const { data: ownedTags } = await supabase!
      .from('tags')
      .select('id')
      .eq('org_id', org!.id)
      .in('id', tagIds)

    const ownedIds = new Set((ownedTags || []).map((t) => t.id))
    if (tagIds.some((id) => !ownedIds.has(id))) {
      return errorResponse('One or more tags not found', 404)
    }
  }

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

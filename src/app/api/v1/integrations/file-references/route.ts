import { NextRequest } from 'next/server'
import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'

export async function GET(request: NextRequest) {
  const { supabase, error } = await getAuthenticatedClient()
  if (error) return error

  const episodeId = request.nextUrl.searchParams.get('episode_id')
  const deliverableId = request.nextUrl.searchParams.get('deliverable_id')

  if (!episodeId && !deliverableId) return errorResponse('episode_id or deliverable_id required')

  let query = supabase!
    .from('file_references')
    .select('*')
    .order('created_at', { ascending: false })

  if (episodeId) query = query.eq('episode_id', episodeId)
  if (deliverableId) query = query.eq('deliverable_id', deliverableId)

  const { data, error: dbError } = await query
  if (dbError) return errorResponse(dbError.message, 500)
  return jsonResponse(data)
}

export async function POST(request: Request) {
  const { supabase, user, org, error } = await getAuthenticatedClient()
  if (error) return error

  const body = await request.json()

  if (!body.provider || !body.external_id || !body.name) {
    return errorResponse('provider, external_id, and name are required')
  }
  if (!body.episode_id && !body.deliverable_id) {
    return errorResponse('episode_id or deliverable_id is required')
  }

  const { data, error: dbError } = await supabase!
    .from('file_references')
    .insert({
      user_id: user!.id,
      org_id: org!.id,
      provider: body.provider,
      external_id: body.external_id,
      external_url: body.external_url || null,
      name: body.name,
      thumbnail_url: body.thumbnail_url || null,
      mime_type: body.mime_type || null,
      file_size: body.file_size || null,
      duration_seconds: body.duration_seconds || null,
      provider_metadata: body.provider_metadata || null,
      episode_id: body.episode_id || null,
      deliverable_id: body.deliverable_id || null,
    })
    .select()
    .single()

  if (dbError) return errorResponse(dbError.message, 500)

  if (body.episode_id) {
    const { data: episode } = await supabase!
      .from('episodes')
      .select('show_id, title, image_url')
      .eq('id', body.episode_id)
      .single()

    if (episode) {
      if (body.thumbnail_url && !episode.image_url) {
        await supabase!.from('episodes').update({ image_url: body.thumbnail_url }).eq('id', body.episode_id)
      }

      await supabase!.from('activity_log').insert({
        show_id: episode.show_id,
        episode_id: body.episode_id,
        action: 'file_linked',
        description: `${body.provider} file linked: ${body.name}`,
        metadata: { file_reference_id: data.id, provider: body.provider },
      })
    }
  }

  return jsonResponse(data, 201)
}

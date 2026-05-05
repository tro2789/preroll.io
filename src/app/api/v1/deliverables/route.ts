import { NextRequest } from 'next/server'
import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'

export async function GET(request: NextRequest) {
  const { supabase, error } = await getAuthenticatedClient()
  if (error) return error

  const searchParams = request.nextUrl.searchParams
  const showId = searchParams.get('show_id')
  const episodeId = searchParams.get('episode_id')
  const status = searchParams.get('status')

  let query = supabase!
    .from('deliverables')
    .select('*, episodes(title)')
    .order('created_at', { ascending: false })

  if (showId) query = query.eq('show_id', showId)
  if (episodeId) query = query.eq('episode_id', episodeId)
  if (status) query = query.eq('status', status)

  const { data, error: dbError } = await query

  if (dbError) return errorResponse(dbError.message, 500)
  return jsonResponse(data)
}

export async function POST(request: Request) {
  const { supabase, error } = await getAuthenticatedClient()
  if (error) return error

  const body = await request.json()
  if (!body.show_id) return errorResponse('show_id is required')
  if (!body.title) return errorResponse('title is required')

  const { data, error: dbError } = await supabase!
    .from('deliverables')
    .insert({
      show_id: body.show_id,
      episode_id: body.episode_id || null,
      type: body.type || 'other',
      title: body.title,
      description: body.description || null,
      file_url: body.file_url || null,
      file_key: body.file_key || null,
    })
    .select()
    .single()

  if (dbError) return errorResponse(dbError.message, 500)

  const externalFileId = body.external_file_id || body.frameio_file_id
  const fileProvider = body.provider || (body.frameio_file_id ? 'frame_io' : null)

  if (externalFileId && fileProvider && body.episode_id) {
    const { data: { user } } = await supabase!.auth.getUser()
    await supabase!.from('file_references').insert({
      user_id: user!.id,
      provider: fileProvider,
      external_id: externalFileId,
      name: body.title,
      external_url: body.file_url || null,
      episode_id: body.episode_id,
      deliverable_id: data.id,
    })
  }

  await supabase!.from('activity_log').insert({
    show_id: body.show_id,
    episode_id: body.episode_id || null,
    action: 'deliverable_submitted',
    description: `Deliverable submitted for review: ${body.title}`,
    metadata: { deliverable_id: data.id, type: body.type || 'other' },
  })

  return jsonResponse(data, 201)
}

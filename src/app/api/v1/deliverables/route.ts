import { NextRequest } from 'next/server'
import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'
import { getShowForOrg } from '@/lib/api/ownership'
import { dispatchWebhooks } from '@/lib/webhooks/dispatch'

export async function GET(request: NextRequest) {
  const { supabase, org, error } = await getAuthenticatedClient()
  if (error) return error

  const searchParams = request.nextUrl.searchParams
  const showId = searchParams.get('show_id')
  const episodeId = searchParams.get('episode_id')
  const status = searchParams.get('status')

  const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10) || 100, 200)
  const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10) || 0, 0)

  let query = supabase!
    .from('deliverables')
    .select('*, episodes(title), shows!inner(clients!inner(org_id))')
    .eq('shows.clients.org_id', org!.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (showId) query = query.eq('show_id', showId)
  if (episodeId) query = query.eq('episode_id', episodeId)
  if (status) query = query.eq('status', status)

  const { data, error: dbError } = await query

  if (dbError) return errorResponse(dbError.message, 500)
  return jsonResponse(data)
}

export async function POST(request: Request) {
  const { supabase, org, error } = await getAuthenticatedClient()
  if (error) return error

  const body = await request.json()
  if (!body.show_id) return errorResponse('show_id is required')
  if (!body.title) return errorResponse('title is required')

  if (!(await getShowForOrg(supabase!, body.show_id, org!.id))) return errorResponse('Show not found', 404)

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
      producer_notes: body.producer_notes || null,
    })
    .select()
    .single()

  if (dbError) return errorResponse(dbError.message, 500)

  const externalFileId = body.external_file_id || body.frameio_file_id
  const fileProvider = body.provider || (body.frameio_file_id ? 'frame_io' : null)

  if (externalFileId && fileProvider && body.episode_id) {
    if (fileProvider === 'r2') {
      const { data: existingRef } = await supabase!
        .from('file_references')
        .select('id, version_group_id')
        .eq('id', externalFileId)
        .eq('provider', 'r2')
        .single()

      if (existingRef) {
        await supabase!
          .from('file_references')
          .update({ deliverable_id: data.id })
          .eq('id', existingRef.id)
        await supabase!
          .from('deliverables')
          .update({ version_group_id: existingRef.version_group_id, file_reference_id: existingRef.id })
          .eq('id', data.id)
      }
    } else {
      const { data: { user } } = await supabase!.auth.getUser()
      const { data: fileRef } = await supabase!.from('file_references').insert({
        user_id: user!.id,
        org_id: org!.id,
        provider: fileProvider,
        external_id: externalFileId,
        name: body.title,
        mime_type: body.mime_type || null,
        external_url: body.file_url || null,
        episode_id: body.episode_id,
        deliverable_id: data.id,
      }).select('id, version_group_id').single()

      if (fileRef) {
        await supabase!
          .from('deliverables')
          .update({ version_group_id: fileRef.version_group_id, file_reference_id: fileRef.id })
          .eq('id', data.id)
      }
    }
  }

  await supabase!.from('activity_log').insert({
    show_id: body.show_id,
    episode_id: body.episode_id || null,
    action: 'deliverable_submitted',
    description: `Deliverable submitted for review: ${body.title}`,
    metadata: { deliverable_id: data.id, type: body.type || 'other' },
  })

  dispatchWebhooks(org!.id, 'deliverable.submitted', {
    deliverable_id: data.id,
    show_id: body.show_id,
    episode_id: body.episode_id || null,
    title: body.title,
    type: body.type || 'other',
  })

  return jsonResponse(data, 201)
}

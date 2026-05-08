import { NextRequest } from 'next/server'
import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'
import { resolveImageUrl } from '@/lib/r2/client'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ episodeId: string }> }
) {
  const { episodeId } = await params
  const { supabase, org, error } = await getAuthenticatedClient()
  if (error) return error

  const { data: episode, error: epError } = await supabase!
    .from('episodes')
    .select('id, show_id, shows(client_id, clients(org_id))')
    .eq('id', episodeId)
    .single()

  if (epError || !episode) return errorResponse('Episode not found', 404)

  const show = episode.shows as unknown as { clients: { org_id: string } | null } | null
  if (!show?.clients || show.clients.org_id !== org!.id) return errorResponse('Forbidden', 403)

  const type = request.nextUrl.searchParams.get('type')

  let query = supabase!
    .from('assets')
    .select('*')
    .eq('episode_id', episodeId)
    .order('created_at', { ascending: false })

  if (type) query = query.eq('asset_type', type)

  const { data, error: dbError } = await query

  if (dbError) return errorResponse(dbError.message, 500)

  const assets = (data || []).map((a: Record<string, unknown>) => ({
    ...a,
    url: a.file_key ? resolveImageUrl(a.file_key as string) : null,
  }))

  return jsonResponse(assets)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ episodeId: string }> }
) {
  const { episodeId } = await params
  const { supabase, org, error } = await getAuthenticatedClient()
  if (error) return error

  const { data: episode, error: epError } = await supabase!
    .from('episodes')
    .select('id, show_id, shows(client_id, clients(org_id))')
    .eq('id', episodeId)
    .single()

  if (epError || !episode) return errorResponse('Episode not found', 404)

  const show = episode.shows as unknown as { clients: { org_id: string } | null } | null
  if (!show?.clients || show.clients.org_id !== org!.id) return errorResponse('Forbidden', 403)

  const body = await request.json()
  const { name, file_key, asset_type, file_size, mime_type } = body

  if (!name || !file_key || !asset_type) {
    return errorResponse('name, file_key, and asset_type are required', 400)
  }

  const { data, error: dbError } = await supabase!
    .from('assets')
    .insert({
      show_id: episode.show_id,
      episode_id: episodeId,
      name,
      file_key,
      asset_type,
      file_size: file_size || null,
      mime_type: mime_type || null,
    })
    .select()
    .single()

  if (dbError) return errorResponse(dbError.message, 500)

  const assetUrl = resolveImageUrl(file_key)

  if (asset_type === 'thumbnail' && assetUrl) {
    await supabase!.from('episodes').update({ image_url: assetUrl }).eq('id', episodeId)
  }

  if (asset_type === 'cover_art' && assetUrl) {
    await supabase!.from('shows').update({ cover_art_url: assetUrl }).eq('id', episode.show_id)
  }

  return jsonResponse({
    ...data,
    url: assetUrl,
  }, 201)
}

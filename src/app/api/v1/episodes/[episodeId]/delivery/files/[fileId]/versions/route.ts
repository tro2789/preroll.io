import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ episodeId: string; fileId: string }> }
) {
  const { episodeId, fileId } = await params
  const { supabase, org, error } = await getAuthenticatedClient()
  if (error) return error

  const { data: episode } = await supabase!
    .from('episodes')
    .select('id, shows(id, client_id, clients(org_id))')
    .eq('id', episodeId)
    .single()

  if (!episode) return errorResponse('Episode not found', 404)
  const show = episode.shows as unknown as { clients: { org_id: string } | null } | null
  if (!show?.clients || show.clients.org_id !== org!.id) return errorResponse('Forbidden', 403)

  const { data: file } = await supabase!
    .from('file_references')
    .select('version_group_id')
    .eq('id', fileId)
    .single()

  if (!file) return errorResponse('File not found', 404)

  const { data: versions, error: dbError } = await supabase!
    .from('file_references')
    .select('id, name, version_number, is_latest, thumbnail_url, mime_type, file_size, duration_seconds, external_url, created_at')
    .eq('version_group_id', file.version_group_id)
    .order('version_number', { ascending: false })

  if (dbError) return errorResponse(dbError.message, 500)

  return jsonResponse({
    version_group_id: file.version_group_id,
    versions: versions || [],
  })
}

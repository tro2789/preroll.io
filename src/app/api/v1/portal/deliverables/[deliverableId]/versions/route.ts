import { createClient } from '@/lib/supabase/server'
import { jsonResponse, errorResponse } from '@/lib/api/helpers'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ deliverableId: string }> }
) {
  const { deliverableId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return errorResponse('Unauthorized', 401)

  // Look up the deliverable and verify the client has access
  const { data: deliverable, error: delError } = await supabase
    .from('deliverables')
    .select('id, version_group_id, show_id, shows(client_id, clients(client_user_id))')
    .eq('id', deliverableId)
    .single()

  if (delError || !deliverable) return errorResponse('Deliverable not found', 404)

  const show = deliverable.shows as unknown as { client_id: string; clients: { client_user_id: string | null } | null } | null
  if (!show?.clients || show.clients.client_user_id !== user.id) {
    return errorResponse('Forbidden', 403)
  }

  // If no version_group_id, return empty versions array
  if (!deliverable.version_group_id) {
    return jsonResponse({ versions: [] })
  }

  // Query all file_references in this version group
  const { data: versions, error: dbError } = await supabase
    .from('file_references')
    .select('id, name, version_number, is_latest, thumbnail_url, mime_type, file_size, duration_seconds, external_url, created_at')
    .eq('version_group_id', deliverable.version_group_id)
    .order('version_number', { ascending: false })

  if (dbError) return errorResponse(dbError.message, 500)

  return jsonResponse({ versions: versions || [] })
}

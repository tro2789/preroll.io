import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'
import { dispatchWebhooks } from '@/lib/webhooks/dispatch'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ episodeId: string }> }
) {
  const { episodeId } = await params
  const { supabase, org, error } = await getAuthenticatedClient()
  if (error) return error

  const body = await request.json()
  if (!body.file_id) return errorResponse('file_id is required')
  if (!body.target_file_id) return errorResponse('target_file_id is required')

  const { data: episode } = await supabase!
    .from('episodes')
    .select('id, shows(id, client_id, clients(org_id))')
    .eq('id', episodeId)
    .single()

  if (!episode) return errorResponse('Episode not found', 404)
  const show = episode.shows as unknown as { clients: { org_id: string } | null } | null
  if (!show?.clients || show.clients.org_id !== org!.id) return errorResponse('Forbidden', 403)

  const { data: targetFile } = await supabase!
    .from('file_references')
    .select('id, version_group_id, episode_id')
    .eq('id', body.target_file_id)
    .single()

  if (!targetFile) return errorResponse('Target file not found', 404)
  if (targetFile.episode_id !== episodeId) return errorResponse('Target file does not belong to this episode', 400)

  const { data: sourceFile } = await supabase!
    .from('file_references')
    .select('id, episode_id')
    .eq('id', body.file_id)
    .single()

  if (!sourceFile) return errorResponse('Source file not found', 404)
  if (sourceFile.episode_id !== episodeId) return errorResponse('Source file does not belong to this episode', 400)

  const { data: result, error: rpcError } = await supabase!
    .rpc('add_file_to_version_group', {
      p_file_id: body.file_id,
      p_target_group_id: targetFile.version_group_id,
    })

  if (rpcError) return errorResponse(rpcError.message, 500)

  const { data: autoUpdated } = await supabase!
    .from('deliverables')
    .select('id, show_id, episode_id, title, type')
    .eq('version_group_id', targetFile.version_group_id)
    .eq('status', 'pending')

  if (autoUpdated && autoUpdated.length > 0) {
    for (const deliverable of autoUpdated) {
      dispatchWebhooks(org!.id, 'deliverable.resubmitted', {
        deliverable_id: deliverable.id,
        show_id: deliverable.show_id,
        episode_id: deliverable.episode_id,
        title: deliverable.title,
        type: deliverable.type,
        version_number: result.version_number,
      })
    }
  }

  return jsonResponse(result)
}

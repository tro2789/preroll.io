import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'
import { dispatchWebhooks } from '@/lib/webhooks/dispatch'

async function findOrCreateFileRef(
  supabase: NonNullable<Awaited<ReturnType<typeof getAuthenticatedClient>>['supabase']>,
  externalId: string,
  episodeId: string,
  orgId: string,
  userId: string,
  meta: { name?: string; mimeType?: string; viewUrl?: string; provider?: string }
) {
  const { data: existing } = await supabase
    .from('file_references')
    .select('id, version_group_id, episode_id')
    .eq('external_id', externalId)
    .eq('episode_id', episodeId)
    .maybeSingle()

  if (existing) return existing

  const { data: integration } = await supabase
    .from('episode_integrations')
    .select('provider')
    .eq('episode_id', episodeId)
    .maybeSingle()

  const { data: created } = await supabase
    .from('file_references')
    .insert({
      user_id: userId,
      org_id: orgId,
      provider: meta.provider || integration?.provider || 'frame_io',
      external_id: externalId,
      name: meta.name || externalId,
      mime_type: meta.mimeType || null,
      external_url: meta.viewUrl || null,
      episode_id: episodeId,
    })
    .select('id, version_group_id, episode_id')
    .single()

  return created
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ episodeId: string }> }
) {
  const { episodeId } = await params
  const { supabase, user, org, error } = await getAuthenticatedClient()
  if (error) return error

  const body = await request.json()
  if (!body.source_external_id) return errorResponse('source_external_id is required')
  if (!body.target_external_id) return errorResponse('target_external_id is required')

  const { data: episode } = await supabase!
    .from('episodes')
    .select('id, shows(id, client_id, clients(org_id))')
    .eq('id', episodeId)
    .single()

  if (!episode) return errorResponse('Episode not found', 404)
  const show = episode.shows as unknown as { clients: { org_id: string } | null } | null
  if (!show?.clients || show.clients.org_id !== org!.id) return errorResponse('Forbidden', 403)

  const targetFile = await findOrCreateFileRef(supabase!, body.target_external_id, episodeId, org!.id, user!.id, {
    name: body.target_name, mimeType: body.target_mime_type, viewUrl: body.target_view_url, provider: body.provider,
  })
  if (!targetFile) return errorResponse('Failed to resolve target file', 500)

  const sourceFile = await findOrCreateFileRef(supabase!, body.source_external_id, episodeId, org!.id, user!.id, {
    name: body.source_name, mimeType: body.source_mime_type, viewUrl: body.source_view_url, provider: body.provider,
  })
  if (!sourceFile) return errorResponse('Failed to resolve source file', 500)

  const { data: result, error: rpcError } = await supabase!
    .rpc('add_file_to_version_group', {
      p_file_id: sourceFile.id,
      p_target_group_id: targetFile.version_group_id,
    })

  if (rpcError) return errorResponse(rpcError.message, 500)

  const { data: autoUpdated } = await supabase!
    .from('deliverables')
    .select('id, show_id, episode_id, title, type')
    .eq('version_group_id', targetFile.version_group_id)
    .eq('status', 'pending')

  const autoResharedIds: string[] = []
  if (autoUpdated && autoUpdated.length > 0) {
    for (const deliverable of autoUpdated) {
      autoResharedIds.push(deliverable.id)

      await supabase!.from('activity_log').insert({
        show_id: deliverable.show_id,
        episode_id: deliverable.episode_id,
        action: 'deliverable_resubmitted',
        description: `New version (v${result.version_number}) of "${deliverable.title}" automatically shared with client`,
        metadata: { deliverable_id: deliverable.id, version_number: result.version_number },
      })

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

  return jsonResponse({ ...result, auto_reshared: autoResharedIds })
}

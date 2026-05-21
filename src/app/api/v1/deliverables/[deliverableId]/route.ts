import { getAuthenticatedClient, getAuthenticatedClientOrPortalUser, jsonResponse, errorResponse } from '@/lib/api/helpers'
import { dispatchWebhooks, WebhookEvent } from '@/lib/webhooks/dispatch'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ deliverableId: string }> }
) {
  const { deliverableId } = await params
  const { supabase, user, org, portalUserId, error } = await getAuthenticatedClientOrPortalUser()
  if (error) return error

  const { data, error: dbError } = await supabase!
    .from('deliverables')
    .select('*, episodes(title), shows(client_id, clients(org_id, client_user_id))')
    .eq('id', deliverableId)
    .single()

  if (dbError || !data) return errorResponse('Deliverable not found', 404)

  const client = (data.shows as Record<string, unknown>)?.clients as { org_id: string; client_user_id: string | null } | null
  const isProducer = org && client?.org_id === org.id
  const isClient = client?.client_user_id === user!.id
  if (!isProducer && !isClient) return errorResponse('Forbidden', 403)

  return jsonResponse(data)
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ deliverableId: string }> }
) {
  const { deliverableId } = await params
  const { supabase, user, org, error } = await getAuthenticatedClient()
  if (error) return error

  const body = await request.json()

  const { data: existing, error: fetchError } = await supabase!
    .from('deliverables')
    .select('*, shows(client_id, clients(org_id, client_user_id))')
    .eq('id', deliverableId)
    .single()

  if (fetchError || !existing) return errorResponse('Deliverable not found', 404)

  const client = (existing.shows as Record<string, unknown>)?.clients as { org_id: string; client_user_id: string | null } | null
  const isProducer = client?.org_id === org!.id
  const isClient = client?.client_user_id === user!.id

  if (!isProducer && !isClient) return errorResponse('Forbidden', 403)

  const updates: Record<string, unknown> = {}

  if (isClient) {
    if (body.status === 'approved' || body.status === 'revision_requested') {
      updates.status = body.status
      updates.reviewed_at = new Date().toISOString()
      if (body.reviewer_notes !== undefined) updates.reviewer_notes = body.reviewer_notes
    }
  }

  if (isProducer) {
    if (body.title !== undefined) updates.title = body.title
    if (body.description !== undefined) updates.description = body.description
    if (body.file_url !== undefined) updates.file_url = body.file_url
    if (body.file_key !== undefined) updates.file_key = body.file_key
    if (body.producer_notes !== undefined) updates.producer_notes = body.producer_notes
    if (body.status === 'pending') {
      updates.status = 'pending'
      updates.reviewed_at = null
      updates.reviewer_notes = null
    }
  }

  if (Object.keys(updates).length === 0) return errorResponse('No valid updates provided')

  const { data, error: updateError } = await supabase!
    .from('deliverables')
    .update(updates)
    .eq('id', deliverableId)
    .select()
    .single()

  if (updateError) return errorResponse(updateError.message, 500)

  if (updates.status) {
    const actionMap: Record<string, string> = {
      approved: 'deliverable_approved',
      revision_requested: 'deliverable_revision_requested',
      pending: 'deliverable_resubmitted',
    }
    const descMap: Record<string, string> = {
      approved: `'${existing.title}' approved`,
      revision_requested: `Revision requested on '${existing.title}'`,
      pending: `'${existing.title}' resubmitted for review`,
    }
    await supabase!.from('activity_log').insert({
      show_id: existing.show_id,
      episode_id: existing.episode_id,
      action: actionMap[updates.status as string],
      description: descMap[updates.status as string],
      metadata: { deliverable_id: deliverableId },
    })

    const webhookEventMap: Record<string, WebhookEvent> = {
      approved: 'deliverable.approved',
      revision_requested: 'deliverable.revision_requested',
      pending: 'deliverable.resubmitted',
    }
    dispatchWebhooks(client!.org_id, webhookEventMap[updates.status as string], {
      deliverable_id: deliverableId,
      show_id: existing.show_id,
      episode_id: existing.episode_id,
      title: existing.title,
      type: existing.type,
      status: updates.status,
      reviewer_notes: updates.reviewer_notes || null,
    })
  }

  return jsonResponse(data)
}

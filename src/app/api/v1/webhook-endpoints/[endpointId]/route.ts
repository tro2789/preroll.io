import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'

const VALID_EVENTS = [
  'episode.status_changed',
  'episode.stage_changed',
  'episode.published',
  'episode.scheduled',
  'deliverable.submitted',
  'deliverable.approved',
  'deliverable.revision_requested',
  'deliverable.resubmitted',
]

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ endpointId: string }> }
) {
  const { endpointId } = await params
  const { supabase, error } = await getAuthenticatedClient()
  if (error) return error

  const { data, error: dbError } = await supabase!
    .from('webhook_endpoints')
    .select('id, url, events, is_active, description, created_at, updated_at')
    .eq('id', endpointId)
    .single()

  if (dbError) return errorResponse('Webhook endpoint not found', 404)
  return jsonResponse(data)
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ endpointId: string }> }
) {
  const { endpointId } = await params
  const { supabase, error } = await getAuthenticatedClient()
  if (error) return error

  const body = await request.json()
  const updates: Record<string, unknown> = {}

  if (body.url !== undefined) {
    try {
      new URL(body.url)
    } catch {
      return errorResponse('url must be a valid URL')
    }
    updates.url = body.url
  }
  if (body.events !== undefined) {
    const invalid = (body.events as string[]).filter((e) => !VALID_EVENTS.includes(e))
    if (invalid.length) return errorResponse(`Invalid events: ${invalid.join(', ')}`)
    updates.events = body.events
  }
  if (body.is_active !== undefined) updates.is_active = body.is_active
  if (body.description !== undefined) updates.description = body.description

  if (Object.keys(updates).length === 0) return errorResponse('No valid updates provided')

  updates.updated_at = new Date().toISOString()

  const { data, error: dbError } = await supabase!
    .from('webhook_endpoints')
    .update(updates)
    .eq('id', endpointId)
    .select('id, url, events, is_active, description, created_at, updated_at')
    .single()

  if (dbError) return errorResponse(dbError.message, 500)
  return jsonResponse(data)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ endpointId: string }> }
) {
  const { endpointId } = await params
  const { supabase, error } = await getAuthenticatedClient()
  if (error) return error

  const { error: dbError } = await supabase!
    .from('webhook_endpoints')
    .delete()
    .eq('id', endpointId)

  if (dbError) return errorResponse(dbError.message, 500)
  return new Response(null, { status: 204 })
}

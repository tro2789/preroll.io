import { NextRequest } from 'next/server'
import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'
import { getValidToken, getIntegrationAccountId } from '@/lib/integrations/token-refresh'
import { ensureProvidersRegistered } from '@/lib/integrations/init'

const FRAMEIO_API = 'https://api.frame.io/v4'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function secsToTimecode(secs: number): string {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = Math.floor(secs % 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}:00`
}

function timecodeToSecs(tc: string | number | null): number | null {
  if (tc === null || tc === undefined) return null
  if (typeof tc === 'number') return tc / 24
  if (typeof tc === 'string' && tc.includes(':')) {
    const parts = tc.split(':').map(Number)
    if (parts.length < 3) return null
    const [h, m, s, f] = parts
    return h * 3600 + m * 60 + s + (f || 0) / 24
  }
  return null
}

async function getFrameIoContext(
  supabase: Awaited<ReturnType<typeof getAuthenticatedClient>>['supabase'],
  deliverableId: string
) {
  // Resolve producer user_id via deliverable -> show -> client
  const { data: deliverable } = await supabase!
    .from('deliverables')
    .select('id, shows(client_id, clients(user_id))')
    .eq('id', deliverableId)
    .single()

  if (!deliverable) return null

  const show = deliverable.shows as unknown as { clients: { user_id: string } | null } | null
  const producerUserId = show?.clients?.user_id
  if (!producerUserId) return null

  // Get Frame.io file reference for this deliverable
  const { data: fileRef } = await supabase!
    .from('file_references')
    .select('*')
    .eq('deliverable_id', deliverableId)
    .eq('provider', 'frame_io')
    .maybeSingle()

  if (!fileRef) return null

  try {
    ensureProvidersRegistered()
    const accessToken = await getValidToken(producerUserId, 'frame_io')
    const accountId = await getIntegrationAccountId(producerUserId, 'frame_io')
    return { fileRef, accessToken, accountId }
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// GET — list comments with Frame.io sync
// ---------------------------------------------------------------------------

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ deliverableId: string }> }
) {
  const { deliverableId } = await params
  const { supabase, error } = await getAuthenticatedClient()
  if (error) return error

  // 1. Fetch local comments
  const { data: localComments, error: dbError } = await supabase!
    .from('review_comments')
    .select('*')
    .eq('deliverable_id', deliverableId)
    .order('timestamp_secs', { ascending: true, nullsFirst: true })
    .order('created_at', { ascending: true })

  if (dbError) return errorResponse(dbError.message, 500)

  const comments = [...(localComments || [])]

  // 2. Try to sync from Frame.io
  const fio = await getFrameIoContext(supabase, deliverableId)
  if (fio) {
    try {
      const res = await fetch(
        `${FRAMEIO_API}/accounts/${fio.accountId}/files/${fio.fileRef.external_id}/comments?include=owner&page_size=100`,
        { headers: { Authorization: `Bearer ${fio.accessToken}` } }
      )

      if (res.ok) {
        const json = await res.json()
        const fioComments = Array.isArray(json) ? json : json.data || []

        const existingExternalIds = new Set(
          comments.filter((c) => c.external_id).map((c) => c.external_id)
        )

        for (const fc of fioComments) {
          if (existingExternalIds.has(fc.id)) continue

          const timestampSecs = timecodeToSecs(fc.timestamp)

          const { data: inserted } = await supabase!
            .from('review_comments')
            .insert({
              deliverable_id: deliverableId,
              file_reference_id: fio.fileRef.id,
              author_name: fc.owner?.name || fc.owner?.email || 'Editor',
              text: fc.text,
              timestamp_secs: timestampSecs,
              external_id: fc.id,
              synced_at: new Date().toISOString(),
              is_external: true,
            })
            .select()
            .single()

          if (inserted) comments.push(inserted)
        }
      }
    } catch (err) {
      console.error('Frame.io comment sync failed:', err)
    }
  }

  // 3. Re-sort merged list
  comments.sort((a, b) => {
    const ta = a.timestamp_secs
    const tb = b.timestamp_secs
    if (ta === null && tb === null) return 0
    if (ta === null) return -1
    if (tb === null) return 1
    if (ta !== tb) return ta - tb
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  })

  return jsonResponse(comments)
}

// ---------------------------------------------------------------------------
// POST — create comment and push to Frame.io
// ---------------------------------------------------------------------------

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ deliverableId: string }> }
) {
  const { deliverableId } = await params
  const { supabase, user, error } = await getAuthenticatedClient()
  if (error) return error

  const body = await request.json()
  const text = body.text
  const timestampSecs: number | null = body.timestamp_secs ?? null

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return errorResponse('text is required')
  }

  // Get commenter name
  const { data: clientRecord } = await supabase!
    .from('clients')
    .select('name')
    .eq('client_user_id', user!.id)
    .maybeSingle()

  const authorName = clientRecord?.name || user!.email || 'Unknown'

  // Get file reference for this deliverable
  const { data: fileRef } = await supabase!
    .from('file_references')
    .select('id')
    .eq('deliverable_id', deliverableId)
    .eq('provider', 'frame_io')
    .maybeSingle()

  // Insert local comment
  const { data: comment, error: insertError } = await supabase!
    .from('review_comments')
    .insert({
      deliverable_id: deliverableId,
      file_reference_id: fileRef?.id || null,
      user_id: user!.id,
      author_name: authorName,
      text: text.trim(),
      timestamp_secs: timestampSecs,
      is_external: false,
      synced_at: null,
    })
    .select()
    .single()

  if (insertError) return errorResponse(insertError.message, 500)

  // Push to Frame.io if file reference exists
  const fio = await getFrameIoContext(supabase, deliverableId)
  if (fio) {
    try {
      const fioBody: Record<string, unknown> = { text: text.trim() }
      if (timestampSecs !== null) {
        fioBody.timestamp = secsToTimecode(timestampSecs)
      }

      const res = await fetch(
        `${FRAMEIO_API}/accounts/${fio.accountId}/files/${fio.fileRef.external_id}/comments`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${fio.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ data: fioBody }),
        }
      )

      if (res.ok) {
        const json = await res.json()
        const externalId = json.data?.id || json.id

        if (externalId) {
          await supabase!
            .from('review_comments')
            .update({
              external_id: externalId,
              synced_at: new Date().toISOString(),
            })
            .eq('id', comment.id)

          comment.external_id = externalId
          comment.synced_at = new Date().toISOString()
        }
      }
    } catch (err) {
      console.error('Frame.io comment push failed:', err)
      // Comment exists locally, don't throw
    }
  }

  return jsonResponse(comment, 201)
}

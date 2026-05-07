import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'
import { encrypt } from '@/lib/integrations/crypto'
import { randomBytes } from 'crypto'

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

export async function GET() {
  const { supabase, error } = await getAuthenticatedClient()
  if (error) return error

  const { data, error: dbError } = await supabase!
    .from('webhook_endpoints')
    .select('id, url, events, is_active, description, created_at, updated_at')
    .order('created_at', { ascending: false })

  if (dbError) return errorResponse(dbError.message, 500)
  return jsonResponse(data)
}

export async function POST(request: Request) {
  const { supabase, user, error } = await getAuthenticatedClient()
  if (error) return error

  const body = await request.json()
  if (!body.url) return errorResponse('url is required')

  try {
    new URL(body.url)
  } catch {
    return errorResponse('url must be a valid URL')
  }

  if (body.events) {
    const invalid = (body.events as string[]).filter((e) => !VALID_EVENTS.includes(e))
    if (invalid.length) return errorResponse(`Invalid events: ${invalid.join(', ')}`)
  }

  const secret = randomBytes(32).toString('hex')
  const secretEnc = encrypt(secret)

  const { data, error: dbError } = await supabase!
    .from('webhook_endpoints')
    .insert({
      user_id: user!.id,
      url: body.url,
      secret_enc: secretEnc,
      events: body.events || [],
      description: body.description || null,
    })
    .select('id, url, events, is_active, description, created_at, updated_at')
    .single()

  if (dbError) return errorResponse(dbError.message, 500)

  return jsonResponse({ ...data, secret }, 201)
}

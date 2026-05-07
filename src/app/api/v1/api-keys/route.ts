import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'
import { createHash, randomBytes } from 'crypto'

export async function GET() {
  const { supabase, error } = await getAuthenticatedClient()
  if (error) return error

  const { data, error: dbError } = await supabase!
    .from('api_keys')
    .select('id, name, last_used_at, created_at')
    .order('created_at', { ascending: false })

  if (dbError) return errorResponse(dbError.message, 500)
  return jsonResponse(data)
}

export async function POST(request: Request) {
  const { supabase, user, error } = await getAuthenticatedClient()
  if (error) return error

  const body = await request.json()
  if (!body.name) return errorResponse('name is required')

  const rawKey = `pr_${randomBytes(32).toString('hex')}`
  const keyHash = createHash('sha256').update(rawKey).digest('hex')

  const { data, error: dbError } = await supabase!
    .from('api_keys')
    .insert({
      user_id: user!.id,
      key_hash: keyHash,
      name: body.name,
    })
    .select('id, name, created_at')
    .single()

  if (dbError) return errorResponse(dbError.message, 500)

  return jsonResponse({ ...data, key: rawKey }, 201)
}

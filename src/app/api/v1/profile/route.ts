import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const { user, error } = await getAuthenticatedClient()
  if (error) return error

  const service = createServiceClient()
  const { data: profile } = await service
    .from('user_profiles')
    .select('display_name, avatar_url, created_at, updated_at')
    .eq('user_id', user!.id)
    .single()

  return jsonResponse({
    id: user!.id,
    email: user!.email,
    display_name: profile?.display_name || null,
    avatar_url: profile?.avatar_url || null,
    created_at: profile?.created_at || null,
  })
}

export async function PATCH(request: Request) {
  const { user, error } = await getAuthenticatedClient()
  if (error) return error

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid JSON body')
  }

  const updates: Record<string, unknown> = {}

  if (typeof body.display_name === 'string') {
    const name = (body.display_name as string).trim()
    if (!name) return errorResponse('Display name cannot be empty')
    if (name.length > 100) return errorResponse('Display name too long (max 100 characters)')
    updates.display_name = name
  }

  if (typeof body.avatar_url === 'string') {
    updates.avatar_url = body.avatar_url || null
  }

  if (Object.keys(updates).length === 0) {
    return errorResponse('No valid fields to update')
  }

  const service = createServiceClient()
  const { data: profile, error: updateError } = await service
    .from('user_profiles')
    .update(updates)
    .eq('user_id', user!.id)
    .select('display_name, avatar_url, updated_at')
    .single()

  if (updateError) return errorResponse(updateError.message, 500)

  return jsonResponse({
    id: user!.id,
    email: user!.email,
    ...profile,
  })
}

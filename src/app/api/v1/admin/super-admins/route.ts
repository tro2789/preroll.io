import { NextRequest } from 'next/server'
import { getAdminClient, logAdminAction } from '@/lib/admin/api-auth'
import { jsonResponse, errorResponse } from '@/lib/api/helpers'

export async function GET() {
  const { service, error } = await getAdminClient()
  if (error) return error

  const { data, error: fetchError } = await service!
    .from('super_admins')
    .select('user_id, created_at')
    .order('created_at')

  if (fetchError) return errorResponse(fetchError.message, 500)

  return jsonResponse(data)
}

export async function POST(request: NextRequest) {
  const { service, actor, error } = await getAdminClient()
  if (error) return error

  let body: { user_id?: string }
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid JSON body')
  }

  if (!body.user_id || typeof body.user_id !== 'string') {
    return errorResponse('user_id is required')
  }

  const { data: profile, error: profileError } = await service!
    .from('user_profiles')
    .select('user_id')
    .eq('user_id', body.user_id)
    .single()

  if (profileError || !profile) {
    return errorResponse('User not found', 404)
  }

  const { error: insertError } = await service!
    .from('super_admins')
    .insert({ user_id: body.user_id })

  if (insertError) {
    if (insertError.code === '23505') {
      return errorResponse('User is already a super admin', 409)
    }
    return errorResponse(insertError.message, 500)
  }

  await logAdminAction(service!, actor, 'super_admin.grant', {
    type: 'user', id: body.user_id,
  })

  return jsonResponse({ user_id: body.user_id }, 201)
}

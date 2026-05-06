import { NextRequest } from 'next/server'
import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'

export async function GET() {
  const { supabase, user, error } = await getAuthenticatedClient()
  if (error) return error

  const { data, error: dbError } = await supabase!
    .from('tags')
    .select('*')
    .eq('user_id', user!.id)
    .order('name')

  if (dbError) return errorResponse(dbError.message, 500)
  return jsonResponse(data)
}

export async function POST(request: NextRequest) {
  const { supabase, user, error } = await getAuthenticatedClient()
  if (error) return error

  const body = await request.json()
  if (!body.name?.trim()) return errorResponse('name is required')

  const { data, error: dbError } = await supabase!
    .from('tags')
    .insert({
      user_id: user!.id,
      name: body.name.trim(),
      color: body.color || '#6366f1',
    })
    .select()
    .single()

  if (dbError) return errorResponse(dbError.message, 500)
  return jsonResponse(data, 201)
}

import { NextResponse } from 'next/server'
import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'

export async function GET() {
  const { supabase, error } = await getAuthenticatedClient()
  if (error) return error

  const { data, error: dbError, count } = await supabase!
    .from('clients')
    .select('*', { count: 'exact' })
    .order('name')

  if (dbError) return errorResponse(dbError.message, 500)
  return NextResponse.json({ data, count })
}

export async function POST(request: Request) {
  const { supabase, user, error } = await getAuthenticatedClient()
  if (error) return error

  const body = await request.json()
  if (!body.name) return errorResponse('name is required')

  const { data, error: dbError } = await supabase!
    .from('clients')
    .insert({
      user_id: user!.id,
      name: body.name,
      company: body.company || null,
      email: body.email || null,
      phone: body.phone || null,
      notes: body.notes || null,
      service_terms: body.service_terms || null,
    })
    .select()
    .single()

  if (dbError) return errorResponse(dbError.message, 500)
  return jsonResponse(data, 201)
}

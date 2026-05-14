import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'
import { getOrgEntitlements } from '@/lib/entitlements'
import { requireRole } from '@/lib/org/roles'

export async function GET(request: NextRequest) {
  const { supabase, org, error } = await getAuthenticatedClient()
  if (error) return error

  const clientId = request.nextUrl.searchParams.get('client_id')

  let query = supabase!
    .from('shows')
    .select('*, clients!inner(org_id)', { count: 'exact' })
    .eq('clients.org_id', org!.id)
    .order('name')

  if (clientId) {
    query = query.eq('client_id', clientId)
  }

  const { data, error: dbError, count } = await query

  if (dbError) return errorResponse(dbError.message, 500)
  return NextResponse.json({ data, count })
}

export async function POST(request: Request) {
  const { supabase, org, error } = await getAuthenticatedClient()
  if (error) return error

  const roleError = requireRole(org!, 'admin')
  if (roleError) return roleError

  const entitlements = await getOrgEntitlements(org!.id, org!.planId, org!.trialEndsAt)
  const max = entitlements.limit('max_shows')
  if (max !== null) {
    const { count } = await supabase!.from('shows').select('id, clients!inner(org_id)', { count: 'exact', head: true }).eq('clients.org_id', org!.id)
    if ((count ?? 0) >= max) {
      return errorResponse(`Your plan allows ${max} show. Upgrade to Pro for unlimited shows.`, 403)
    }
  }

  const body = await request.json()
  if (!body.client_id) return errorResponse('client_id is required')
  if (!body.name) return errorResponse('name is required')

  const { data: show, error: showError } = await supabase!
    .from('shows')
    .insert({
      client_id: body.client_id,
      name: body.name,
      description: body.description || null,
      format: body.format || null,
      schedule: body.schedule || null,
      transistor_show_id: body.transistor_show_id || null,
      cover_art_url: body.cover_art_url || null,
    })
    .select()
    .single()

  if (showError) return errorResponse(showError.message, 500)

  const defaultStages = [
    { show_id: show.id, name: 'Submitted', position: 1, status_override: 'submitted' },
    { show_id: show.id, name: 'Editing', position: 2, status_override: 'editing' },
    { show_id: show.id, name: 'Review', position: 3, status_override: 'review' },
    { show_id: show.id, name: 'Approved', position: 4, status_override: 'approved' },
    { show_id: show.id, name: 'Published', position: 5, status_override: 'published' },
  ]

  const { data: stages, error: stagesError } = await supabase!
    .from('pipeline_stages')
    .insert(defaultStages)
    .select()

  if (stagesError) return errorResponse(stagesError.message, 500)

  return jsonResponse({ ...show, pipeline_stages: stages }, 201)
}

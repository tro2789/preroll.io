import { NextRequest } from 'next/server'
import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'
import { createInviteToken } from '@/lib/integrations/invite-token'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ showId: string }> }
) {
  const { showId } = await params
  const { supabase, org, error } = await getAuthenticatedClient()
  if (error) return error

  const { data: show } = await supabase!
    .from('shows')
    .select('id, name, clients(name)')
    .eq('id', showId)
    .single()

  if (!show) return errorResponse('Show not found', 404)

  const token = createInviteToken({
    showId,
    orgId: org!.id,
    provider: 'youtube',
  })

  const origin = request.nextUrl.origin
  const connectUrl = `${origin}/connect/youtube?token=${token}`

  return jsonResponse({
    url: connectUrl,
    token,
    expires_in_days: 7,
    show_name: show.name,
  })
}

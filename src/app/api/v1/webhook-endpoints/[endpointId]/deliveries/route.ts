import { NextRequest } from 'next/server'
import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ endpointId: string }> }
) {
  const { endpointId } = await params
  const { supabase, org, error } = await getAuthenticatedClient()
  if (error) return error

  const { data: endpoint } = await supabase!
    .from('webhook_endpoints')
    .select('id')
    .eq('id', endpointId)
    .eq('org_id', org!.id)
    .single()

  if (!endpoint) return errorResponse('Webhook endpoint not found', 404)

  const limit = Math.min(Number(request.nextUrl.searchParams.get('limit')) || 50, 100)

  const { data, error: dbError } = await supabase!
    .from('webhook_deliveries')
    .select('id, event_type, status_code, error, created_at')
    .eq('endpoint_id', endpointId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (dbError) return errorResponse(dbError.message, 500)
  return jsonResponse(data)
}

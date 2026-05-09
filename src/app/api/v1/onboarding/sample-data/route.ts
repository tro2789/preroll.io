import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'
import { createServiceClient } from '@/lib/supabase/server'

export async function DELETE() {
  const { org, error } = await getAuthenticatedClient()
  if (error) return error

  const service = createServiceClient()

  const { error: delError } = await service
    .from('clients')
    .delete()
    .eq('org_id', org!.id)
    .eq('is_sample', true)

  if (delError) return errorResponse(delError.message, 500)

  return jsonResponse({ removed: true })
}

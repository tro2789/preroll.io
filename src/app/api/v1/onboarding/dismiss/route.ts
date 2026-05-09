import { getAuthenticatedClient, jsonResponse } from '@/lib/api/helpers'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST() {
  const { org, error } = await getAuthenticatedClient()
  if (error) return error

  const service = createServiceClient()

  await service
    .from('organizations')
    .update({ onboarding_dismissed_at: new Date().toISOString() })
    .eq('id', org!.id)

  await service
    .from('clients')
    .delete()
    .eq('org_id', org!.id)
    .eq('is_sample', true)

  return jsonResponse({ dismissed: true })
}

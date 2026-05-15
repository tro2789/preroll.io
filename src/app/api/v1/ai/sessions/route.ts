import { getAuthenticatedClient, jsonResponse } from '@/lib/api/helpers'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const { user, org, error } = await getAuthenticatedClient()
  if (error) return error

  const supabase = createServiceClient()

  const { data: sessions } = await supabase
    .from('ai_chat_sessions')
    .select('id, title, context_type, context_id, created_at, updated_at')
    .eq('org_id', org!.id)
    .eq('user_id', user!.id)
    .order('updated_at', { ascending: false })
    .limit(20)

  return jsonResponse({ sessions: sessions || [] })
}

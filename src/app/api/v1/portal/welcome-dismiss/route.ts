import { createClient } from '@/lib/supabase/server'
import { jsonResponse, errorResponse } from '@/lib/api/helpers'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return errorResponse('Unauthorized', 401)

  const { error } = await supabase
    .from('clients')
    .update({ portal_welcome_dismissed_at: new Date().toISOString() })
    .eq('client_user_id', user.id)

  if (error) return errorResponse(error.message, 500)
  return jsonResponse({ dismissed: true })
}

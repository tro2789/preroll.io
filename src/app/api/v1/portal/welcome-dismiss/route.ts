import { createClient, createServiceClient } from '@/lib/supabase/server'
import { jsonResponse, errorResponse } from '@/lib/api/helpers'
import { cookies } from 'next/headers'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return errorResponse('Unauthorized', 401)

  const cookieStore = await cookies()
  const previewClientId = cookieStore.get('portal_preview_client_id')?.value

  if (previewClientId) {
    const serviceClient = createServiceClient()
    const { error } = await serviceClient
      .from('clients')
      .update({ portal_welcome_dismissed_at: new Date().toISOString() })
      .eq('id', previewClientId)
    if (error) return errorResponse(error.message, 500)
  } else {
    const { error } = await supabase
      .from('clients')
      .update({ portal_welcome_dismissed_at: new Date().toISOString() })
      .eq('client_user_id', user.id)
    if (error) return errorResponse(error.message, 500)
  }

  return jsonResponse({ dismissed: true })
}

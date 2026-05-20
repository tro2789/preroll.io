import { createClient, createServiceClient } from '@/lib/supabase/server'
import { errorResponse } from '@/lib/api/helpers'
import { isSuperAdmin } from './auth'

export async function getAdminClient() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { service: null, error: errorResponse('Unauthorized', 401) }
  }

  if (!(await isSuperAdmin(user.id))) {
    return { service: null, error: errorResponse('Forbidden', 403) }
  }

  return { service: createServiceClient(), error: null }
}

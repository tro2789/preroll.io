import { createClient, createServiceClient } from '@/lib/supabase/server'
import { errorResponse } from '@/lib/api/helpers'
import { isSuperAdmin } from './auth'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface AdminActor {
  id: string
  email: string | null
}

export async function getAdminClient() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { service: null, actor: null, error: errorResponse('Unauthorized', 401) }
  }

  if (!(await isSuperAdmin(user.id))) {
    return { service: null, actor: null, error: errorResponse('Forbidden', 403) }
  }

  const actor: AdminActor = { id: user.id, email: user.email ?? null }
  return { service: createServiceClient(), actor, error: null }
}

/**
 * Append-only forensic record of privileged super-admin actions
 * (impersonation, deletes, credit grants, super-admin grants). Best-effort:
 * never throws so it cannot block the action it is recording.
 */
export async function logAdminAction(
  service: SupabaseClient,
  actor: AdminActor | null,
  action: string,
  target: { type?: string; id?: string; metadata?: Record<string, unknown> } = {}
): Promise<void> {
  try {
    await service.from('admin_audit_log').insert({
      actor_user_id: actor?.id ?? null,
      actor_email: actor?.email ?? null,
      action,
      target_type: target.type ?? null,
      target_id: target.id ?? null,
      metadata: target.metadata ?? null,
    })
  } catch (err) {
    console.error('admin audit log failed:', err instanceof Error ? err.message : err)
  }
}

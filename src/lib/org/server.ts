import { cookies } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/server'
import { ORG_COOKIE_NAME } from '@/lib/constants/plans'

export async function getActiveOrgId(userId: string): Promise<string | null> {
  const cookieStore = await cookies()
  const preferred = cookieStore.get(ORG_COOKIE_NAME)?.value

  if (preferred) {
    const service = createServiceClient()
    const { data } = await service
      .from('memberships')
      .select('org_id')
      .eq('user_id', userId)
      .eq('org_id', preferred)
      .single()
    if (data) return data.org_id
  }

  const service = createServiceClient()
  const { data } = await service
    .from('memberships')
    .select('org_id')
    .eq('user_id', userId)
    .limit(1)
    .single()

  return data?.org_id ?? null
}

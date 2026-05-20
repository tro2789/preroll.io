import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function requireSuperAdmin(): Promise<{ userId: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const service = createServiceClient()
  const { data } = await service
    .from('super_admins')
    .select('user_id')
    .eq('user_id', user.id)
    .single()

  if (!data) redirect('/app')

  return { userId: user.id }
}

export async function isSuperAdmin(userId: string): Promise<boolean> {
  const service = createServiceClient()
  const { data } = await service
    .from('super_admins')
    .select('user_id')
    .eq('user_id', userId)
    .single()

  return !!data
}

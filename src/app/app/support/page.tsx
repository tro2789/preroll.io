import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { resolveUserOrg } from '@/lib/org/resolve'
import { SupportPageClient } from './support-client'

export const metadata = {
  title: 'Support',
}

export default async function SupportPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const org = await resolveUserOrg(user.id)
  if (!org) redirect('/app')

  const service = createServiceClient()
  const [{ data: profile }, { data: orgRow }] = await Promise.all([
    service.from('user_profiles').select('display_name').eq('user_id', user.id).single(),
    service.from('organizations').select('name').eq('id', org.id).single(),
  ])

  return (
    <SupportPageClient
      identity={{
        userId: user.id,
        email: user.email ?? '',
        name: profile?.display_name || undefined,
        planId: org.planId,
        orgName: orgRow?.name || undefined,
      }}
    />
  )
}

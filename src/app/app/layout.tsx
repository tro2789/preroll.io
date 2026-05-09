import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import type { OrgMembership } from '@/components/layout/sidebar'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const service = createServiceClient()
  const { data: memberships } = await service
    .from('memberships')
    .select('org_id, role, organizations(id, name, plan_id)')
    .eq('user_id', user.id)

  const cookieStore = await cookies()
  const activeOrgId = cookieStore.get('preroll_org')?.value

  const orgs: OrgMembership[] = (memberships || []).map((m) => {
    const org = m.organizations as unknown as { id: string; name: string; plan_id: string }
    return { id: org.id, name: org.name, planId: org.plan_id, role: m.role }
  })

  const activeOrg = orgs.find((o) => o.id === activeOrgId) || orgs[0]

  return (
    <div className="min-h-screen bg-surface-base">
      <Sidebar orgs={orgs} activeOrgId={activeOrg?.id} />
      <div className="md:pl-64 flex flex-col min-h-screen">
        <Header email={user.email ?? ''} />
        <main className="flex-1 p-4 sm:p-6 pb-20 md:pb-6">
          {children}
        </main>
      </div>
    </div>
  )
}

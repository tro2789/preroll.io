import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { resolveImageUrl } from '@/lib/r2/client'
import { Sidebar } from '@/components/layout/sidebar'
import { ORG_COOKIE_NAME } from '@/lib/constants/plans'
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

  const [service, cookieStore] = [createServiceClient(), await cookies()]
  const [{ data: memberships }, { data: profile }, activeOrgId] = await Promise.all([
    service
      .from('memberships')
      .select('org_id, role, organizations(id, name, plan_id, logo_url)')
      .eq('user_id', user.id),
    service
      .from('user_profiles')
      .select('display_name, avatar_url')
      .eq('user_id', user.id)
      .single(),
    Promise.resolve(cookieStore.get(ORG_COOKIE_NAME)?.value),
  ])

  const orgs: OrgMembership[] = (memberships || []).map((m) => {
    const org = m.organizations as unknown as { id: string; name: string; plan_id: string; logo_url: string | null }
    return { id: org.id, name: org.name, planId: org.plan_id, role: m.role, logoUrl: resolveImageUrl(org.logo_url) || undefined }
  })

  const activeOrg = orgs.find((o) => o.id === activeOrgId) || orgs[0]

  return (
    <div className="min-h-screen bg-surface-base overflow-x-hidden">
      <Sidebar
        orgs={orgs}
        activeOrgId={activeOrg?.id}
        userEmail={user.email ?? ''}
        userDisplayName={profile?.display_name || null}
      />
      <div className="md:pl-64 flex flex-col min-h-screen">
        <main className="flex-1 p-4 sm:p-6 pb-20 md:pb-6">
          {children}
        </main>
      </div>
    </div>
  )
}

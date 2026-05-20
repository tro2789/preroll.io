import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { resolveImageUrl } from '@/lib/r2/client'
import { Sidebar } from '@/components/layout/sidebar'
import { Topbar } from '@/components/layout/topbar'
import { NoOrgsPrompt } from '@/components/layout/no-orgs-prompt'
import { ORG_COOKIE_NAME } from '@/lib/constants/plans'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ChatShell } from '@/components/chat/chat-shell'
import { ThemeProvider } from '@/components/layout/theme-provider'
import { isSuperAdmin } from '@/lib/admin/auth'
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
  const [{ data: memberships }, { data: profile }, activeOrgId, showAdminLink] = await Promise.all([
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
    isSuperAdmin(user.id),
  ])

  const orgs: OrgMembership[] = (memberships || []).map((m) => {
    const org = m.organizations as unknown as { id: string; name: string; plan_id: string; logo_url: string | null }
    return { id: org.id, name: org.name, planId: org.plan_id, role: m.role, logoUrl: resolveImageUrl(org.logo_url) || undefined }
  })

  const activeOrg = orgs.find((o) => o.id === activeOrgId) || orgs[0]

  if (orgs.length === 0) {
    return <NoOrgsPrompt />
  }

  const orgId = activeOrg?.id
  let navCounts: { shows?: number; clients?: number; inFlight?: number } = {}
  if (orgId) {
    const { data: orgShows } = await service.from('shows').select('id').eq('org_id', orgId)
    const showIds = orgShows?.map(s => s.id) || []

    const [{ count: showCount }, { count: clientCount }, { count: inFlightCount }] = await Promise.all([
      Promise.resolve({ count: showIds.length }),
      service.from('clients').select('id', { count: 'exact', head: true }).eq('org_id', orgId),
      showIds.length > 0
        ? service.from('episodes').select('id', { count: 'exact', head: true })
            .in('show_id', showIds)
            .not('status', 'eq', 'published')
        : Promise.resolve({ count: 0 }),
    ])
    navCounts = { shows: showCount ?? 0, clients: clientCount ?? 0, inFlight: inFlightCount ?? 0 }
  }

  return (
    <ThemeProvider>
      <TooltipProvider>
        <ChatShell>
          <div className="min-h-screen bg-surface-base overflow-x-hidden">
            <Sidebar
            orgs={orgs}
            activeOrgId={activeOrg?.id}
            userEmail={user.email ?? ''}
            userDisplayName={profile?.display_name || null}
            counts={navCounts}
            showAdminLink={showAdminLink}
          />
          <div className="md:pl-[244px] flex flex-col min-h-screen">
            <Topbar />
            <main className="flex-1 px-4 sm:px-7 pt-5 pb-20 md:pb-16 max-w-[1640px] mx-auto w-full">
              {children}
            </main>
          </div>
        </div>
        </ChatShell>
      </TooltipProvider>
    </ThemeProvider>
  )
}

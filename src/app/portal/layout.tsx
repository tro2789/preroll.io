import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PortalHeader } from '@/components/portal/portal-header'
import { getOrgEntitlements, isSelfHosted } from '@/lib/entitlements'

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: client } = await supabase
    .from('clients')
    .select('name, org_id, organizations(display_name, logo_url, accent_color, plan_id)')
    .eq('client_user_id', user.id)
    .single()

  if (!client) {
    redirect('/login')
  }

  const org = client.organizations as unknown as {
    display_name: string | null
    logo_url: string | null
    accent_color: string | null
    plan_id: string
  } | null

  let orgDisplayName: string | undefined
  let logoUrl: string | undefined
  let accentColor: string | undefined

  if (org) {
    const hasWhiteLabel = isSelfHosted() || (await getOrgEntitlements(client.org_id)).can('white_label')
    if (hasWhiteLabel) {
      orgDisplayName = org.display_name || undefined
      logoUrl = org.logo_url || undefined
      accentColor = org.accent_color || undefined
    }
  }

  return (
    <div className="min-h-screen bg-surface-base overflow-x-hidden">
      {accentColor && (
        <style>{`:root { --color-accent: ${accentColor}; }`}</style>
      )}
      <PortalHeader
        clientName={client.name}
        email={user.email ?? ''}
        orgDisplayName={orgDisplayName}
        logoUrl={logoUrl}
      />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {children}
      </main>
    </div>
  )
}

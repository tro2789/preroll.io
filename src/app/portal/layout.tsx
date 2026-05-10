import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { PortalHeader } from '@/components/portal/portal-header'
import { PortalPreviewBanner } from '@/components/portal/preview-banner'
import { getOrgEntitlements, isSelfHosted } from '@/lib/entitlements'

const CLIENT_SELECT = 'name, org_id, organizations(display_name, logo_url, accent_color, plan_id)' as const

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

  const headersList = await headers()
  const url = headersList.get('x-url') || ''
  const previewClientId = url ? new URL(url, 'http://localhost').searchParams.get('preview') : null

  let isPreview = false
  let client: { name: string; org_id: string; organizations: unknown } | null = null

  if (previewClientId) {
    const { data } = await supabase
      .from('clients')
      .select(CLIENT_SELECT)
      .eq('id', previewClientId)
      .single()

    if (data) {
      client = data
      isPreview = true
    }
  }

  if (!client) {
    const { data } = await supabase
      .from('clients')
      .select(CLIENT_SELECT)
      .eq('client_user_id', user.id)
      .single()

    client = data
  }

  if (!client) {
    redirect('/login')
  }

  const org = client.organizations as {
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
      {isPreview && <PortalPreviewBanner clientName={client.name} />}
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

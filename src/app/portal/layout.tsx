export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PortalHeader } from '@/components/portal/portal-header'
import { PortalPreviewBanner } from '@/components/portal/preview-banner'
import { getOrgEntitlements, isSelfHosted } from '@/lib/entitlements'
import { resolvePortalClient } from '@/lib/portal/resolve'
import { resolveImageUrl } from '@/lib/r2/client'

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

  const { client, isPreview } = await resolvePortalClient(supabase, user.id)

  if (!client) {
    redirect('/login')
  }

  const org = client.organizations

  let orgDisplayName: string | undefined
  let logoUrl: string | undefined
  let accentColor: string | undefined
  let portalCustomCss: string | undefined

  if (org) {
    const hasWhiteLabel = isSelfHosted() || (await getOrgEntitlements(client.org_id)).can('white_label')
    if (hasWhiteLabel) {
      orgDisplayName = org.display_name || undefined
      logoUrl = resolveImageUrl(org.logo_url) || undefined
      accentColor = org.accent_color || undefined
      portalCustomCss = org.portal_custom_css || undefined
    }
  }

  return (
    <div className="min-h-screen bg-surface-base overflow-x-hidden">
      {accentColor && (
        <style>{`:root { --color-accent: ${accentColor}; }`}</style>
      )}
      {portalCustomCss && (
        <style>{portalCustomCss}</style>
      )}
      {isPreview && <PortalPreviewBanner clientName={client.name} />}
      <PortalHeader
        clientName={client.name}
        email={user.email ?? ''}
        orgDisplayName={orgDisplayName}
        logoUrl={logoUrl}
      />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {children}
      </main>
    </div>
  )
}

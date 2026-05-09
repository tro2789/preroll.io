import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ConnectButton } from '@/components/integrations/connect-button'
import { ConnectedAccountCard } from '@/components/integrations/connected-account-card'
import { UpgradeGate } from '@/components/ui/upgrade-gate'
import { getOrgEntitlements } from '@/lib/entitlements'
import { resolveUserOrg } from '@/lib/org/resolve'

const PROVIDERS = [
  { name: 'frame_io', displayName: 'Frame.io', comingSoon: false },
  { name: 'google_drive', displayName: 'Google Drive', comingSoon: false },
  { name: 'vimeo', displayName: 'Vimeo', comingSoon: false, note: 'In-app video playback requires a Vimeo Pro, Business, or Premium plan.' },
  { name: 'dropbox', displayName: 'Dropbox', comingSoon: true },
]

function IntegrationsIcon() {
  return (
    <svg className="h-6 w-6 text-accent" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m9.86-2.07a4.5 4.5 0 0 0-1.242-7.244l4.5-4.5a4.5 4.5 0 1 1 6.364 6.364l-1.757 1.757" />
    </svg>
  )
}

export default async function IntegrationsPage({ searchParams }: { searchParams: Promise<{ connect?: string; returnTo?: string }> }) {
  const { connect: autoConnectProvider, returnTo } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const org = await resolveUserOrg(user.id)
  if (!org) redirect('/login')

  const entitlements = await getOrgEntitlements(org.id, org.planId, org.trialEndsAt)

  if (!entitlements.can('integrations')) {
    return (
      <UpgradeGate
        feature="Integrations"
        description="Connect Frame.io, Google Drive, Vimeo, and more to streamline your delivery workflow. Available on the Pro plan."
        tier="Pro"
        icon={<IntegrationsIcon />}
      />
    )
  }

  const { data: integrations } = await supabase
    .from('user_integrations')
    .select('id, provider, account_name, account_email, account_avatar_url, created_at')
    .eq('user_id', user.id)

  const connectedMap = new Map(
    (integrations || []).map((i) => [i.provider, i])
  )

  return (
    <div>
      <div className="space-y-3">
        <h2 className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
          Connected Accounts
        </h2>

        {PROVIDERS.map((provider) => {
          const connected = connectedMap.get(provider.name)
          if (connected) {
            return (
              <ConnectedAccountCard
                key={provider.name}
                provider={provider.name}
                displayName={provider.displayName}
                accountName={connected.account_name}
                accountEmail={connected.account_email}
                accountAvatarUrl={connected.account_avatar_url}
                connectedAt={connected.created_at}
                note={provider.note}
              />
            )
          }
          return (
            <ConnectButton
              key={provider.name}
              provider={provider.name}
              displayName={provider.displayName}
              comingSoon={provider.comingSoon}
              note={provider.note}
              autoConnect={autoConnectProvider === provider.name}
              returnTo={autoConnectProvider === provider.name ? returnTo : undefined}
            />
          )
        })}
      </div>
    </div>
  )
}

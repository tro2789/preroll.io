import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ConnectButton } from '@/components/integrations/connect-button'
import { ConnectedAccountCard } from '@/components/integrations/connected-account-card'

const PROVIDERS = [
  { name: 'frame_io', displayName: 'Frame.io', comingSoon: false },
  { name: 'google_drive', displayName: 'Google Drive', comingSoon: false },
  { name: 'vimeo', displayName: 'Vimeo', comingSoon: false, note: 'In-app video playback requires a Vimeo Pro, Business, or Premium plan.' },
  { name: 'dropbox', displayName: 'Dropbox', comingSoon: true },
]

export default async function IntegrationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: integrations } = await supabase
    .from('user_integrations')
    .select('id, provider, account_name, account_email, account_avatar_url, created_at')
    .eq('user_id', user.id)

  const connectedMap = new Map(
    (integrations || []).map((i) => [i.provider, i])
  )

  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary">Settings</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Manage your connected accounts and integrations.
      </p>

      <div className="mt-8 space-y-3">
        <h2 className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
          Integrations
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
            />
          )
        })}
      </div>
    </div>
  )
}

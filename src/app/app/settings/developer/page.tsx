import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { UpgradeGate } from '@/components/ui/upgrade-gate'
import { getOrgEntitlements } from '@/lib/entitlements'
import { resolveUserOrg } from '@/lib/org/resolve'
import { DeveloperTabs } from './developer-tabs'

function DeveloperIcon() {
  return (
    <svg className="h-6 w-6 text-accent" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" />
    </svg>
  )
}

const PROVIDERS = [
  { name: 'frame_io', displayName: 'Frame.io', comingSoon: false },
  { name: 'google_drive', displayName: 'Google Drive', comingSoon: false },
  { name: 'vimeo', displayName: 'Vimeo', comingSoon: false, note: 'In-app video playback requires a Vimeo Pro, Business, or Premium plan.' },
  { name: 'youtube', displayName: 'YouTube', comingSoon: false },
  { name: 'dropbox', displayName: 'Dropbox', comingSoon: true },
]

export default async function DeveloperPage({ searchParams }: { searchParams: Promise<{ tab?: string; connect?: string; returnTo?: string; connected?: string; error?: string }> }) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const org = await resolveUserOrg(user.id)
  if (!org) redirect('/login')

  const entitlements = await getOrgEntitlements(org.id, org.planId, org.trialEndsAt)

  const canIntegrations = entitlements.can('integrations')
  const canWebhooks = entitlements.can('webhooks')
  const canApiKeys = entitlements.can('api_keys')

  if (!canIntegrations && !canWebhooks && !canApiKeys) {
    return (
      <UpgradeGate
        feature="Developer Tools"
        description="Connect integrations, configure webhooks, and generate API keys to automate your workflow. Available on the Pro plan."
        tier="Pro"
        icon={<DeveloperIcon />}
      />
    )
  }

  const [integrationsResult, endpointsResult, keysResult] = await Promise.all([
    canIntegrations
      ? supabase
          .from('user_integrations')
          .select('id, provider, account_name, account_email, account_avatar_url, created_at')
          .eq('user_id', user.id)
      : Promise.resolve({ data: null }),
    canWebhooks
      ? supabase
          .from('webhook_endpoints')
          .select('id, url, events, is_active, description, created_at, updated_at')
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: null }),
    canApiKeys
      ? supabase
          .from('api_keys')
          .select('id, name, last_used_at, created_at')
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: null }),
  ])

  return (
    <DeveloperTabs
      providers={PROVIDERS}
      integrations={integrationsResult.data || []}
      endpoints={endpointsResult.data || []}
      apiKeys={keysResult.data || []}
      canIntegrations={canIntegrations}
      canWebhooks={canWebhooks}
      canApiKeys={canApiKeys}
      autoConnectProvider={params.connect}
      returnTo={params.returnTo}
      connectedProvider={params.connected}
      oauthError={params.error}
      initialTab={params.tab}
    />
  )
}

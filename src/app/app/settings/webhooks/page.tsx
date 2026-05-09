import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { WebhookEndpointList } from '@/components/webhooks/endpoint-list'
import { UpgradeGate } from '@/components/ui/upgrade-gate'
import { getOrgEntitlements } from '@/lib/entitlements'
import { resolveUserOrg } from '@/lib/org/resolve'

function WebhooksIcon() {
  return (
    <svg className="h-6 w-6 text-accent" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
    </svg>
  )
}

export default async function WebhooksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const org = await resolveUserOrg(user.id)
  if (!org) redirect('/login')

  const entitlements = await getOrgEntitlements(org.id, org.planId, org.trialEndsAt)

  if (!entitlements.can('webhooks')) {
    return (
      <UpgradeGate
        feature="Webhooks"
        description="Send real-time event notifications to external services when episodes move through your pipeline. Available on the Pro plan."
        tier="Pro"
        icon={<WebhooksIcon />}
      />
    )
  }

  const { data: endpoints } = await supabase
    .from('webhook_endpoints')
    .select('id, url, events, is_active, description, created_at, updated_at')
    .order('created_at', { ascending: false })

  return <WebhookEndpointList endpoints={endpoints || []} />
}

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ApiKeyList } from '@/components/api-keys/api-key-list'
import { UpgradeGate } from '@/components/ui/upgrade-gate'
import { getOrgEntitlements } from '@/lib/entitlements'
import { resolveUserOrg } from '@/lib/org/resolve'

function ApiKeysIcon() {
  return (
    <svg className="h-6 w-6 text-accent" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" />
    </svg>
  )
}

export default async function ApiKeysPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const org = await resolveUserOrg(user.id)
  if (!org) redirect('/login')

  const entitlements = await getOrgEntitlements(org.id, org.planId, org.trialEndsAt)

  if (!entitlements.can('api_keys')) {
    return (
      <UpgradeGate
        feature="API Keys"
        description="Access the PreRoll API to build custom automations, connect the MCP server, or integrate with your own tools. Available on the Pro plan."
        tier="Pro"
        icon={<ApiKeysIcon />}
      />
    )
  }

  const { data: keys } = await supabase
    .from('api_keys')
    .select('id, name, last_used_at, created_at')
    .order('created_at', { ascending: false })

  return <ApiKeyList keys={keys || []} />
}

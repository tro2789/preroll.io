import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { WebhookEndpointList } from '@/components/webhooks/endpoint-list'
import { WebhookGuide } from '@/components/webhooks/guide'

export default async function WebhooksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: endpoints } = await supabase
    .from('webhook_endpoints')
    .select('id, url, events, is_active, description, created_at, updated_at')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-10">
      <WebhookEndpointList endpoints={endpoints || []} />
      <WebhookGuide />
    </div>
  )
}

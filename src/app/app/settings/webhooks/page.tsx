import { redirect } from 'next/navigation'

export default function WebhooksPage() {
  redirect('/app/settings/developer?tab=webhooks')
}

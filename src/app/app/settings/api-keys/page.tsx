import { redirect } from 'next/navigation'

export default function ApiKeysPage() {
  redirect('/app/settings/developer?tab=api-keys')
}

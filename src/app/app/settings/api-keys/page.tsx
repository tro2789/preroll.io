import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ApiKeyList } from '@/components/api-keys/api-key-list'

export default async function ApiKeysPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: keys } = await supabase
    .from('api_keys')
    .select('id, name, last_used_at, created_at')
    .order('created_at', { ascending: false })

  return <ApiKeyList keys={keys || []} />
}

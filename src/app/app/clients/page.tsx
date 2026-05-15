import { createClient } from '@/lib/supabase/server'
import { getActiveOrgId } from '@/lib/org/server'
import { PageHeader } from '@/components/layout/page-header'
import { ClientsTable } from './clients-table'

export default async function ClientsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const orgId = user ? await getActiveOrgId(user.id) : null

  const { data: clients } = await supabase
    .from('clients')
    .select('id, name, company, email, created_at')
    .eq('org_id', orgId!)
    .order('name')

  return (
    <div>
      <PageHeader
        title="Clients"
      />

      <ClientsTable clients={clients ?? []} />
    </div>
  )
}

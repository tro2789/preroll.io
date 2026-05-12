import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getActiveOrgId } from '@/lib/org/server'
import { PageHeader } from '@/components/layout/page-header'

export default async function ClientsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const orgId = user ? await getActiveOrgId(user.id) : null

  const [{ data: clients }, { data: showCounts }, { data: pendingCounts }] = await Promise.all([
    supabase
      .from('clients')
      .select('id, name, company, email, client_user_id, onboarded_at, invite_code')
      .eq('org_id', orgId!)
      .order('name'),
    supabase
      .from('shows')
      .select('client_id, clients!inner(org_id)')
      .eq('clients.org_id', orgId!),
    supabase
      .from('deliverables')
      .select('show_id, shows!inner(client_id, clients!inner(org_id))')
      .eq('shows.clients.org_id', orgId!)
      .eq('status', 'pending'),
  ])

  const showsByClient = new Map<string, number>()
  for (const s of showCounts ?? []) {
    showsByClient.set(s.client_id, (showsByClient.get(s.client_id) ?? 0) + 1)
  }

  const pendingByClient = new Map<string, number>()
  for (const d of pendingCounts ?? []) {
    const clientId = (d.shows as unknown as { client_id: string })?.client_id
    if (clientId) pendingByClient.set(clientId, (pendingByClient.get(clientId) ?? 0) + 1)
  }

  function portalStatus(c: { client_user_id: string | null; onboarded_at: string | null; invite_code: string | null }) {
    if (c.client_user_id && c.onboarded_at) return { label: 'Active', cls: 'text-emerald-400 bg-emerald-500/10' }
    if (c.client_user_id) return { label: 'Pending', cls: 'text-amber-400 bg-amber-500/10' }
    if (c.invite_code) return { label: 'Invited', cls: 'text-text-tertiary bg-surface-overlay' }
    return null
  }

  return (
    <div>
      <PageHeader
        title="Clients"
        actions={
          <Link
            href="/app/clients/new"
            className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-accent-hover"
          >
            + Add Client
          </Link>
        }
      />

      {clients && clients.length > 0 ? (
        <table className="w-full mt-5">
          <thead>
            <tr className="border-b border-border-subtle text-left">
              <th className="pb-2 text-[11px] font-medium uppercase tracking-wider text-text-secondary">Name</th>
              <th className="pb-2 text-[11px] font-medium uppercase tracking-wider text-text-secondary hidden sm:table-cell">Company</th>
              <th className="pb-2 text-[11px] font-medium uppercase tracking-wider text-text-secondary hidden md:table-cell">Email</th>
              <th className="pb-2 text-[11px] font-medium uppercase tracking-wider text-text-secondary text-center w-16">Shows</th>
              <th className="pb-2 text-[11px] font-medium uppercase tracking-wider text-text-secondary text-center w-20 hidden sm:table-cell">Review</th>
              <th className="pb-2 text-[11px] font-medium uppercase tracking-wider text-text-secondary text-center w-20">Portal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {clients.map((client) => {
              const shows = showsByClient.get(client.id) ?? 0
              const pending = pendingByClient.get(client.id) ?? 0
              const portal = portalStatus(client)

              return (
                <tr key={client.id} className="group">
                  <td className="py-2.5 pr-4">
                    <Link
                      href={`/app/clients/${client.id}`}
                      className="text-sm font-medium text-text-primary group-hover:text-accent transition-colors"
                    >
                      {client.name}
                    </Link>
                  </td>
                  <td className="py-2.5 pr-4 hidden sm:table-cell">
                    <span className="text-sm text-text-secondary">{client.company || '—'}</span>
                  </td>
                  <td className="py-2.5 pr-4 hidden md:table-cell">
                    {client.email ? (
                      <span className="text-sm text-text-secondary">{client.email}</span>
                    ) : (
                      <span className="text-sm text-text-tertiary">{'—'}</span>
                    )}
                  </td>
                  <td className="py-2.5 text-center">
                    <span className="text-sm text-text-secondary tabular-nums">{shows}</span>
                  </td>
                  <td className="py-2.5 text-center hidden sm:table-cell">
                    {pending > 0 ? (
                      <span className="text-xs text-amber-400 tabular-nums">{pending}</span>
                    ) : (
                      <span className="text-sm text-text-tertiary">{'—'}</span>
                    )}
                  </td>
                  <td className="py-2.5 text-center">
                    {portal ? (
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${portal.cls}`}>
                        {portal.label}
                      </span>
                    ) : (
                      <span className="text-sm text-text-tertiary">{'—'}</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      ) : (
        <div className="mt-12 rounded-lg border border-border-subtle border-dashed py-12 text-center">
          <p className="text-sm text-text-tertiary">No clients yet</p>
          <Link
            href="/app/clients/new"
            className="mt-2 inline-block text-xs text-accent hover:text-accent-hover transition-colors font-medium"
          >
            Add your first client
          </Link>
        </div>
      )}
    </div>
  )
}

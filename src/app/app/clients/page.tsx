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
        description="Everyone you produce for, their portal status, and pending reviews."
        actions={
          <Link
            href="/app/clients/new"
            className="rounded-[7px] bg-accent text-white px-[11px] py-[5.5px] text-[13px] font-semibold hover:bg-accent-hover transition-colors"
          >
            + Add Client
          </Link>
        }
      />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 py-3.5 sticky top-12 z-10 bg-surface-base">
        <span className="inline-flex items-center gap-1.5 px-[9px] py-1 rounded-[7px] text-[12.5px] text-text-secondary border border-border-subtle bg-surface-input hover:border-border-default hover:text-text-primary transition-colors cursor-pointer">
          Portal status
          <svg className="w-[11px] h-[11px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="m6 9 6 6 6-6" /></svg>
        </span>
        <div className="flex-1" />
        <span className="inline-flex items-center gap-[7px] px-[9px] py-1 rounded-[7px] text-[12.5px] text-text-tertiary border border-border-subtle bg-surface-input">
          <svg className="w-[13px] h-[13px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
          Search clients…
        </span>
      </div>

      {clients && clients.length > 0 ? (
        <div className="rounded-[10px] border border-border-subtle bg-surface-raised overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border-subtle text-left">
              <th className="px-3.5 py-[9px] text-[11px] font-semibold uppercase tracking-[0.04em] text-fg-faint">Name</th>
              <th className="px-3.5 py-[9px] text-[11px] font-semibold uppercase tracking-[0.04em] text-fg-faint hidden sm:table-cell">Company</th>
              <th className="px-3.5 py-[9px] text-[11px] font-semibold uppercase tracking-[0.04em] text-fg-faint hidden md:table-cell">Email</th>
              <th className="px-3.5 py-[9px] text-[11px] font-semibold uppercase tracking-[0.04em] text-fg-faint text-right w-16">Shows</th>
              <th className="px-3.5 py-[9px] text-[11px] font-semibold uppercase tracking-[0.04em] text-fg-faint text-right w-20 hidden sm:table-cell">Pending review</th>
              <th className="px-3.5 py-[9px] text-[11px] font-semibold uppercase tracking-[0.04em] text-fg-faint">Portal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {clients.map((client) => {
              const shows = showsByClient.get(client.id) ?? 0
              const pending = pendingByClient.get(client.id) ?? 0
              const portal = portalStatus(client)

              return (
                <tr key={client.id} className="group border-b border-border-subtle last:border-b-0 hover:bg-[oklch(0.21_0.006_264_/_0.4)]">
                  <td className="px-3.5 py-2.5">
                    <Link
                      href={`/app/clients/${client.id}`}
                      className="text-[13px] font-medium text-text-primary group-hover:text-accent transition-colors"
                    >
                      {client.name}
                    </Link>
                  </td>
                  <td className="px-3.5 py-2.5 hidden sm:table-cell">
                    <span className="text-[13px] text-text-secondary">{client.company || '—'}</span>
                  </td>
                  <td className="px-3.5 py-2.5 hidden md:table-cell">
                    {client.email ? (
                      <span className="text-[13px] text-text-secondary font-mono">{client.email}</span>
                    ) : (
                      <span className="text-[13px] text-text-tertiary">{'—'}</span>
                    )}
                  </td>
                  <td className="px-3.5 py-2.5 text-right">
                    <span className="text-[13px] text-text-primary font-mono tabular-nums">{shows}</span>
                  </td>
                  <td className="px-3.5 py-2.5 text-right hidden sm:table-cell">
                    {pending > 0 ? (
                      <span className="text-[13px] text-warning font-mono tabular-nums">{pending}</span>
                    ) : (
                      <span className="text-[13px] text-fg-faint">{'—'}</span>
                    )}
                  </td>
                  <td className="px-3.5 py-2.5">
                    {portal ? (
                      <span className={`inline-flex items-center gap-1.5 text-[11.5px] font-medium px-2 py-0.5 rounded-full border border-border-subtle bg-surface-input ${portal.cls}`}>
                        {portal.label}
                      </span>
                    ) : (
                      <span className="text-[13px] text-fg-faint">{'—'}</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        </div>
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

import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { resolveImageUrl } from '@/lib/r2/client'
import { ClientDetailActions } from './client-detail-actions'
import { ClientPortalSection } from '@/components/client-portal-section'
import { Thumbnail } from '@/components/ui/thumbnail'

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ clientId: string }>
}) {
  const { clientId } = await params
  const supabase = await createClient()

  const { data: client, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .single()

  if (error || !client) {
    return (
      <div className="text-center py-12">
        <p className="text-text-secondary">Client not found.</p>
        <Link
          href="/app/clients"
          className="mt-4 inline-block text-sm text-accent hover:text-accent-hover"
        >
          Back to Clients
        </Link>
      </div>
    )
  }

  const [{ data: shows }, { count: notesCount }] = await Promise.all([
    supabase
      .from('shows')
      .select('id, name, cover_art_url')
      .eq('client_id', clientId)
      .order('name'),
    supabase
      .from('meeting_notes')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', clientId),
  ])

  const showIds = (shows ?? []).map((s) => s.id)

  const [{ data: episodes }, { data: pendingDeliverables }] = showIds.length > 0
    ? await Promise.all([
        supabase
          .from('episodes')
          .select('id, show_id')
          .in('show_id', showIds)
          .is('archived_at', null),
        supabase
          .from('deliverables')
          .select('id, show_id')
          .eq('status', 'pending')
          .in('show_id', showIds),
      ])
    : [{ data: [] }, { data: [] }]

  const episodesByShow = new Map<string, number>()
  for (const ep of episodes ?? []) {
    episodesByShow.set(ep.show_id, (episodesByShow.get(ep.show_id) ?? 0) + 1)
  }

  const pendingByShow = new Map<string, number>()
  for (const d of pendingDeliverables ?? []) {
    pendingByShow.set(d.show_id, (pendingByShow.get(d.show_id) ?? 0) + 1)
  }

  return (
    <div>
      <Link
        href="/app/clients"
        className="text-xs text-text-tertiary hover:text-text-secondary transition-colors"
      >
        &larr; Clients
      </Link>

      <div className="mt-3 grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        {/* Left column: client profile */}
        <div className="space-y-5">
          <div className="rounded-lg border border-border-subtle bg-surface-raised p-5">
            {/* Name + actions */}
            <div className="flex items-start justify-between gap-2">
              <h1 className="text-lg font-bold text-text-primary leading-tight">{client.name}</h1>
              <div className="flex items-center gap-1.5 shrink-0 -mt-0.5">
                <Link
                  href={`/app/clients/${clientId}/edit`}
                  className="p-1.5 rounded text-text-tertiary hover:text-text-primary hover:bg-surface-overlay transition-colors"
                  title="Edit client"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                  </svg>
                </Link>
                <ClientDetailActions clientId={clientId} />
              </div>
            </div>
            {client.company && (
              <p className="text-sm text-text-secondary mt-0.5">{client.company}</p>
            )}

            {/* Contact fields */}
            <dl className="mt-4 space-y-2.5">
              <div>
                <dt className="text-[11px] text-text-tertiary uppercase tracking-wider">Email</dt>
                {client.email ? (
                  <dd className="text-sm text-text-secondary mt-0.5">
                    <a href={`mailto:${client.email}`} className="hover:text-accent transition-colors">{client.email}</a>
                  </dd>
                ) : (
                  <dd className="text-xs text-text-tertiary mt-0.5">Not set</dd>
                )}
              </div>
              {client.phone && (
                <div>
                  <dt className="text-[11px] text-text-tertiary uppercase tracking-wider">Phone</dt>
                  <dd className="text-sm text-text-secondary mt-0.5">{client.phone}</dd>
                </div>
              )}
              {client.service_terms && (
                <div>
                  <dt className="text-[11px] text-text-tertiary uppercase tracking-wider">Service Terms</dt>
                  <dd className="text-sm text-text-secondary mt-0.5 whitespace-pre-wrap">{client.service_terms}</dd>
                </div>
              )}
              {client.notes && (
                <div>
                  <dt className="text-[11px] text-text-tertiary uppercase tracking-wider">Notes</dt>
                  <dd className="text-sm text-text-secondary mt-0.5 whitespace-pre-wrap">{client.notes}</dd>
                </div>
              )}
            </dl>

            {/* Meeting notes link */}
            <div className="mt-4 pt-4 border-t border-border-subtle">
              <Link
                href={`/app/clients/${clientId}/notes`}
                className="flex items-center justify-between text-sm group"
              >
                <span className="text-text-secondary group-hover:text-text-primary transition-colors">Meeting Notes</span>
                <span className="text-xs text-text-tertiary group-hover:text-accent transition-colors">
                  {notesCount ?? 0} &rarr;
                </span>
              </Link>
            </div>
          </div>

          <ClientPortalSection
            clientId={clientId}
            clientName={client.name}
            clientEmail={client.email}
            inviteCode={client.invite_code}
            onboardedAt={client.onboarded_at}
          />
        </div>

        {/* Right column: shows */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-text-primary">Shows</h2>
            <Link
              href={`/app/clients/${clientId}/shows/new`}
              className="text-xs text-accent hover:text-accent-hover transition-colors font-medium"
            >
              + New Show
            </Link>
          </div>
          {shows && shows.length > 0 ? (
            <div className="space-y-2">
              {shows.map((show) => {
                const activeEps = episodesByShow.get(show.id) ?? 0
                const pending = pendingByShow.get(show.id) ?? 0
                return (
                  <Link
                    key={show.id}
                    href={`/app/shows/${show.id}`}
                    className="flex items-center gap-4 rounded-lg bg-surface-raised border border-border-subtle p-4 transition-colors hover:border-border-hover group"
                  >
                    <div className="shrink-0 w-14 h-14 rounded-lg overflow-hidden">
                      <Thumbnail id={show.id} imageUrl={resolveImageUrl(show.cover_art_url)} className="w-full h-full" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary group-hover:text-accent transition-colors truncate">
                        {show.name}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-text-tertiary">
                          {activeEps} episode{activeEps !== 1 ? 's' : ''}
                        </span>
                        {pending > 0 && (
                          <span className="text-xs text-amber-400">
                            {pending} pending review
                          </span>
                        )}
                      </div>
                    </div>
                    <svg className="w-4 h-4 text-text-tertiary group-hover:text-text-secondary transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                    </svg>
                  </Link>
                )
              })}
            </div>
          ) : (
            <div className="rounded-lg border border-border-subtle border-dashed py-12 text-center">
              <p className="text-sm text-text-tertiary">No shows yet</p>
              <Link
                href={`/app/clients/${clientId}/shows/new`}
                className="mt-2 inline-block text-xs text-accent hover:text-accent-hover transition-colors font-medium"
              >
                Create the first show
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

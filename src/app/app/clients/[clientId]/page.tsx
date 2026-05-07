import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { resolveImageUrl } from '@/lib/r2/client'
import { ClientDetailActions } from './client-detail-actions'
import { InviteButton } from './invite-button'
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

  const contactFields = [
    client.email && { label: 'Email', value: client.email, href: `mailto:${client.email}` },
    client.phone && { label: 'Phone', value: client.phone },
    client.company && { label: 'Company', value: client.company },
  ].filter(Boolean) as { label: string; value: string; href?: string }[]

  return (
    <div>
      {/* Header */}
      <div>
        <Link
          href="/app/clients"
          className="text-xs text-text-tertiary hover:text-text-secondary transition-colors"
        >
          &larr; Clients
        </Link>
        <div className="mt-2 flex items-center justify-between gap-4">
          <h1 className="text-lg font-bold text-text-primary leading-tight truncate">{client.name}</h1>
          <div className="flex items-center gap-2 shrink-0">
            <InviteButton
              clientId={clientId}
              clientEmail={client.email}
              inviteCode={client.invite_code}
              clientUserId={client.client_user_id}
              onboardedAt={client.onboarded_at}
            />
            <Link
              href={`/app/clients/${clientId}/edit`}
              className="rounded-md border border-border-subtle bg-surface-overlay px-3 py-1.5 text-xs font-medium text-text-primary transition-colors hover:border-border-hover"
            >
              Edit
            </Link>
            <ClientDetailActions clientId={clientId} />
          </div>
        </div>
      </div>

      {/* Contact + metadata row */}
      {contactFields.length > 0 && (
        <div className="mt-3 flex items-center gap-5 text-sm">
          {contactFields.map((f) => (
            <div key={f.label} className="flex items-center gap-1.5">
              <span className="text-text-tertiary text-xs">{f.label}</span>
              {f.href ? (
                <a href={f.href} className="text-text-secondary hover:text-accent transition-colors">{f.value}</a>
              ) : (
                <span className="text-text-secondary">{f.value}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Shows — primary section */}
      <section className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-text-primary">
            Shows
          </h2>
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
                  className="flex items-center gap-4 rounded-lg bg-surface-raised border border-border-subtle p-3 transition-colors hover:border-border-hover group"
                >
                  <div className="shrink-0 w-14 h-14 rounded-lg overflow-hidden">
                    <Thumbnail id={show.id} imageUrl={resolveImageUrl(show.cover_art_url)} className="w-full h-full" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary group-hover:text-accent transition-colors truncate">
                      {show.name}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5">
                      {activeEps > 0 && (
                        <span className="text-xs text-text-tertiary">
                          {activeEps} active episode{activeEps !== 1 ? 's' : ''}
                        </span>
                      )}
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
          <div className="rounded-lg border border-border-subtle border-dashed py-8 text-center">
            <p className="text-sm text-text-tertiary">No shows yet</p>
            <Link
              href={`/app/clients/${clientId}/shows/new`}
              className="mt-2 inline-block text-xs text-accent hover:text-accent-hover transition-colors font-medium"
            >
              Create the first show
            </Link>
          </div>
        )}
      </section>

      {/* Secondary info */}
      <div className="mt-8 border-t border-border-subtle pt-6 grid gap-x-8 gap-y-4 sm:grid-cols-[1fr_1fr_auto]">
        <div>
          <h3 className="text-xs font-medium text-text-tertiary mb-1.5">Notes</h3>
          {client.notes ? (
            <p className="text-sm text-text-secondary whitespace-pre-wrap line-clamp-3">{client.notes}</p>
          ) : (
            <p className="text-xs text-text-tertiary">None</p>
          )}
        </div>
        <div>
          <h3 className="text-xs font-medium text-text-tertiary mb-1.5">Service Terms</h3>
          {client.service_terms ? (
            <p className="text-sm text-text-secondary whitespace-pre-wrap line-clamp-3">{client.service_terms}</p>
          ) : (
            <p className="text-xs text-text-tertiary">None</p>
          )}
        </div>
        <div>
          <h3 className="text-xs font-medium text-text-tertiary mb-1.5">Meeting Notes</h3>
          <Link
            href={`/app/clients/${clientId}/notes`}
            className="text-sm text-accent hover:text-accent-hover transition-colors"
          >
            {notesCount ?? 0} note{(notesCount ?? 0) !== 1 ? 's' : ''}
          </Link>
        </div>
      </div>
    </div>
  )
}

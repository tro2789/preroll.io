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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/app/clients"
          className="text-xs text-text-tertiary hover:text-text-secondary transition-colors"
        >
          &larr; All Clients
        </Link>
        <div className="mt-2 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="text-lg font-bold text-text-primary leading-tight truncate">{client.name}</h1>
            {client.company && (
              <span className="text-sm text-text-tertiary hidden sm:inline">{client.company}</span>
            )}
            <InviteButton
              clientId={clientId}
              clientEmail={client.email}
              inviteCode={client.invite_code}
              clientUserId={client.client_user_id}
              onboardedAt={client.onboarded_at}
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={`/app/clients/${clientId}/edit`}
              className="rounded-md border border-border-subtle bg-surface-overlay px-3 py-1.5 text-xs font-medium text-text-primary transition-colors hover:border-border-hover"
            >
              Edit
            </Link>
            <ClientDetailActions clientId={clientId} />
          </div>
        </div>

        {/* Contact row */}
        <div className="mt-1.5 flex items-center gap-4 text-sm">
          {client.email && (
            <a href={`mailto:${client.email}`} className="text-text-secondary hover:text-accent transition-colors">
              {client.email}
            </a>
          )}
          {client.phone && (
            <span className="text-text-tertiary">{client.phone}</span>
          )}
          {client.company && (
            <span className="text-text-tertiary sm:hidden">{client.company}</span>
          )}
        </div>
      </div>

      {/* Shows */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
            Shows
            {shows && shows.length > 0 && <span className="ml-1.5 normal-case tracking-normal">({shows.length})</span>}
          </h2>
          <Link
            href={`/app/clients/${clientId}/shows/new`}
            className="text-xs text-accent hover:text-accent-hover transition-colors font-medium"
          >
            + Add Show
          </Link>
        </div>
        {shows && shows.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {shows.map((show) => (
              <Link
                key={show.id}
                href={`/app/shows/${show.id}`}
                className="flex items-center gap-3 rounded-lg border border-border-subtle bg-surface-raised p-3 transition-colors hover:border-border-hover"
              >
                <div className="shrink-0 w-12 h-12 rounded-lg overflow-hidden">
                  <Thumbnail id={show.id} imageUrl={resolveImageUrl(show.cover_art_url)} className="w-full h-full" />
                </div>
                <span className="text-sm font-medium text-text-primary truncate">{show.name}</span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-tertiary">No shows yet.</p>
        )}
      </section>

      {/* Details grid — only render sections that have content */}
      {(client.notes || client.service_terms || (notesCount ?? 0) > 0) && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {client.notes && (
            <section className="rounded-lg border border-border-subtle bg-surface-raised p-4">
              <h3 className="text-xs font-medium uppercase tracking-wider text-text-tertiary mb-2">Notes</h3>
              <p className="text-sm text-text-secondary whitespace-pre-wrap line-clamp-4">{client.notes}</p>
            </section>
          )}
          {client.service_terms && (
            <section className="rounded-lg border border-border-subtle bg-surface-raised p-4">
              <h3 className="text-xs font-medium uppercase tracking-wider text-text-tertiary mb-2">Service Terms</h3>
              <p className="text-sm text-text-secondary whitespace-pre-wrap line-clamp-4">{client.service_terms}</p>
            </section>
          )}
          <section className="rounded-lg border border-border-subtle bg-surface-raised p-4">
            <h3 className="text-xs font-medium uppercase tracking-wider text-text-tertiary mb-2">Meeting Notes</h3>
            <Link
              href={`/app/clients/${clientId}/notes`}
              className="text-sm text-accent hover:text-accent-hover transition-colors"
            >
              {notesCount ?? 0} note{(notesCount ?? 0) !== 1 ? 's' : ''} &rarr;
            </Link>
          </section>
        </div>
      )}
    </div>
  )
}

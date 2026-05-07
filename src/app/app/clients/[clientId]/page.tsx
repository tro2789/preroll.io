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
      .select('id, name, format, schedule, cover_art_url')
      .eq('client_id', clientId)
      .order('name'),
    supabase
      .from('meeting_notes')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', clientId),
  ])

  return (
    <div>
      <div>
        <Link
          href="/app/clients"
          className="text-sm text-text-tertiary hover:text-text-secondary transition-colors"
        >
          &larr; All Clients
        </Link>
        <div className="mt-2 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-text-primary leading-tight">{client.name}</h1>
            {client.company && (
              <p className="mt-0.5 text-sm text-text-secondary">{client.company}</p>
            )}
          </div>
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <InviteButton
              clientId={clientId}
              clientEmail={client.email}
              inviteCode={client.invite_code}
              clientUserId={client.client_user_id}
              onboardedAt={client.onboarded_at}
            />
            <Link
              href={`/app/clients/${clientId}/edit`}
              className="rounded-md bg-surface-overlay border border-border-subtle px-3 py-1.5 text-xs font-medium text-text-primary transition-colors hover:border-border-hover"
            >
              Edit
            </Link>
            <ClientDetailActions clientId={clientId} />
          </div>
        </div>
        <div className="mt-3 flex sm:hidden items-center gap-2">
          <InviteButton
            clientId={clientId}
            clientEmail={client.email}
            inviteCode={client.invite_code}
            clientUserId={client.client_user_id}
            onboardedAt={client.onboarded_at}
          />
          <Link
            href={`/app/clients/${clientId}/edit`}
            className="rounded-md bg-surface-overlay border border-border-subtle px-3 py-1.5 text-xs font-medium text-text-primary transition-colors hover:border-border-hover"
          >
            Edit
          </Link>
          <ClientDetailActions clientId={clientId} />
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Contact Info */}
        <section className="rounded-lg border border-border-subtle bg-surface-raised p-5">
          <h2 className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
            Contact Info
          </h2>
          <div className="mt-3 space-y-2">
            {client.email ? (
              <p className="text-sm text-text-secondary">
                <span className="text-text-tertiary">Email:</span>{' '}
                <a
                  href={`mailto:${client.email}`}
                  className="text-accent hover:text-accent-hover"
                >
                  {client.email}
                </a>
              </p>
            ) : (
              <p className="text-sm text-text-tertiary">No email set</p>
            )}
            {client.phone ? (
              <p className="text-sm text-text-secondary">
                <span className="text-text-tertiary">Phone:</span> {client.phone}
              </p>
            ) : (
              <p className="text-sm text-text-tertiary">No phone set</p>
            )}
          </div>
        </section>

        {/* Service Terms */}
        {client.service_terms && (
          <section className="rounded-lg border border-border-subtle bg-surface-raised p-5">
            <h2 className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
              Service Terms
            </h2>
            <p className="mt-3 text-sm text-text-secondary whitespace-pre-wrap">
              {client.service_terms}
            </p>
          </section>
        )}

        {/* Notes */}
        {client.notes && (
          <section className="rounded-lg border border-border-subtle bg-surface-raised p-5">
            <h2 className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
              Notes
            </h2>
            <p className="mt-3 text-sm text-text-secondary whitespace-pre-wrap">
              {client.notes}
            </p>
          </section>
        )}

        {/* Meeting Notes Link */}
        <section className="rounded-lg border border-border-subtle bg-surface-raised p-5">
          <h2 className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
            Meeting Notes
          </h2>
          <div className="mt-3">
            <Link
              href={`/app/clients/${clientId}/notes`}
              className="inline-flex items-center text-sm text-accent hover:text-accent-hover transition-colors"
            >
              View Notes ({notesCount ?? 0})
              <span className="ml-1">&rarr;</span>
            </Link>
          </div>
        </section>
      </div>

      {/* Shows Section */}
      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">Shows</h2>
          <Link
            href={`/app/clients/${clientId}/shows/new`}
            className="inline-flex items-center rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
          >
            Add Show
          </Link>
        </div>
        {shows && shows.length > 0 ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {shows.map((show) => (
              <Link
                key={show.id}
                href={`/app/shows/${show.id}`}
                className="block rounded-lg border border-border-subtle bg-surface-raised overflow-hidden transition-colors hover:border-border-hover"
              >
                <Thumbnail id={show.id} imageUrl={resolveImageUrl(show.cover_art_url)} className="aspect-[16/9]" />
                <div className="p-3">
                  <p className="text-sm font-medium text-text-primary">{show.name}</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-text-tertiary">
            No shows yet for this client.
          </p>
        )}
      </section>
    </div>
  )
}

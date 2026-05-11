import Link from 'next/link'

interface Client {
  id: string
  name: string
  company?: string | null
  email?: string | null
}

export function ClientCard({ client }: { client: Client }) {
  return (
    <Link
      href={`/app/clients/${client.id}`}
      className="block rounded-lg border border-border-subtle bg-surface-raised p-5 transition-colors hover:border-border-hover"
    >
      <h3 className="text-base font-semibold text-text-primary">{client.name}</h3>
      {client.company && (
        <p className="mt-1 text-sm text-text-secondary">{client.company}</p>
      )}
      {client.email && (
        <p className="mt-1 text-sm text-text-secondary">{client.email}</p>
      )}
    </Link>
  )
}

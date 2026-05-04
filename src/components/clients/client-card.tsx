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
      className="block rounded-lg border border-zinc-800 bg-zinc-800/50 p-5 transition-colors hover:border-zinc-700 hover:bg-zinc-800"
    >
      <h3 className="text-base font-semibold text-white">{client.name}</h3>
      {client.company && (
        <p className="mt-1 text-sm text-zinc-400">{client.company}</p>
      )}
      {client.email && (
        <p className="mt-1 text-sm text-zinc-500">{client.email}</p>
      )}
    </Link>
  )
}

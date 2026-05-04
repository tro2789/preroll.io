import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ClientCard } from '@/components/clients/client-card'

export default async function ClientsPage() {
  const supabase = await createClient()
  const { data: clients } = await supabase
    .from('clients')
    .select('*')
    .order('name')

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Clients</h1>
        <Link
          href="/app/clients/new"
          className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
        >
          Add Client
        </Link>
      </div>

      {clients && clients.length > 0 ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clients.map((client) => (
            <ClientCard key={client.id} client={client} />
          ))}
        </div>
      ) : (
        <div className="mt-12 text-center">
          <p className="text-zinc-400">No clients yet.</p>
          <p className="mt-1 text-sm text-zinc-500">
            Get started by adding your first client.
          </p>
        </div>
      )}
    </div>
  )
}

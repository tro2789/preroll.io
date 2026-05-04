'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { ClientForm } from '@/components/clients/client-form'
import Link from 'next/link'

export default function EditClientPage({
  params,
}: {
  params: Promise<{ clientId: string }>
}) {
  const { clientId } = use(params)
  const router = useRouter()
  const [client, setClient] = useState<Record<string, string> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchClient() {
      try {
        const res = await fetch(`/api/v1/clients/${clientId}`)
        if (!res.ok) throw new Error('Client not found')
        const result = await res.json()
        setClient(result.data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load client')
      } finally {
        setLoading(false)
      }
    }
    fetchClient()
  }, [clientId])

  async function handleSubmit(data: {
    name: string
    company: string
    email: string
    phone: string
    notes: string
    service_terms: string
  }) {
    const res = await fetch(`/api/v1/clients/${clientId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const result = await res.json()
    if (!res.ok) {
      throw new Error(result.error || 'Failed to update client')
    }
    router.push(`/app/clients/${clientId}`)
  }

  if (loading) {
    return <p className="text-zinc-400">Loading...</p>
  }

  if (error || !client) {
    return (
      <div className="text-center py-12">
        <p className="text-zinc-400">{error || 'Client not found.'}</p>
        <Link
          href="/app/clients"
          className="mt-4 inline-block text-sm text-indigo-400 hover:text-indigo-300"
        >
          Back to Clients
        </Link>
      </div>
    )
  }

  return (
    <div>
      <Link
        href={`/app/clients/${clientId}`}
        className="text-sm text-zinc-400 hover:text-zinc-300 transition-colors"
      >
        &larr; Back to Client
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-white">Edit Client</h1>
      <p className="mt-1 text-sm text-zinc-400">
        Update {client.name}&apos;s profile.
      </p>
      <div className="mt-6">
        <ClientForm
          defaultValues={{
            name: client.name || '',
            company: client.company || '',
            email: client.email || '',
            phone: client.phone || '',
            notes: client.notes || '',
            service_terms: client.service_terms || '',
          }}
          onSubmit={handleSubmit}
          submitLabel="Save Changes"
        />
      </div>
    </div>
  )
}

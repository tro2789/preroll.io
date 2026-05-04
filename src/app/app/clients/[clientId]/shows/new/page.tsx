'use client'

import { use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ShowForm } from '@/components/shows/show-form'

export default function NewShowPage({
  params,
}: {
  params: Promise<{ clientId: string }>
}) {
  const { clientId } = use(params)
  const router = useRouter()

  async function handleSubmit(data: {
    name: string
    description: string
    format: string
    schedule: string
  }) {
    const res = await fetch('/api/v1/shows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        name: data.name,
        description: data.description || null,
        format: data.format || null,
        schedule: data.schedule || null,
      }),
    })
    const result = await res.json()
    if (!res.ok) {
      throw new Error(result.error || 'Failed to create show')
    }
    router.push(`/app/shows/${result.data.id}`)
  }

  return (
    <div>
      <Link
        href={`/app/clients/${clientId}`}
        className="text-sm text-text-tertiary hover:text-text-secondary transition-colors"
      >
        &larr; Back to Client
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-text-primary">Add Show</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Create a new show for this client.
      </p>
      <div className="mt-6">
        <ShowForm
          clientId={clientId}
          onSubmit={handleSubmit}
          submitLabel="Create Show"
        />
      </div>
    </div>
  )
}

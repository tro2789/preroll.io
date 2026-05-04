'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ShowForm } from '@/components/shows/show-form'

export default function EditShowPage({
  params,
}: {
  params: Promise<{ showId: string }>
}) {
  const { showId } = use(params)
  const router = useRouter()
  const [show, setShow] = useState<Record<string, string> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchShow() {
      try {
        const res = await fetch(`/api/v1/shows/${showId}`)
        if (!res.ok) throw new Error('Show not found')
        const result = await res.json()
        setShow(result.data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load show')
      } finally {
        setLoading(false)
      }
    }
    fetchShow()
  }, [showId])

  async function handleSubmit(data: {
    name: string
    description: string
    format: string
    schedule: string
  }) {
    const res = await fetch(`/api/v1/shows/${showId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const result = await res.json()
    if (!res.ok) {
      throw new Error(result.error || 'Failed to update show')
    }
    router.push(`/app/shows/${showId}`)
  }

  if (loading) {
    return <p className="text-zinc-400">Loading...</p>
  }

  if (error || !show) {
    return (
      <div className="text-center py-12">
        <p className="text-zinc-400">{error || 'Show not found.'}</p>
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
        href={`/app/shows/${showId}`}
        className="text-sm text-zinc-400 hover:text-zinc-300 transition-colors"
      >
        &larr; Back to Show
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-white">Edit Show</h1>
      <p className="mt-1 text-sm text-zinc-400">
        Update {show.name}&apos;s details.
      </p>
      <div className="mt-6">
        <ShowForm
          clientId={show.client_id || ''}
          defaultValues={{
            name: show.name || '',
            description: show.description || '',
            format: show.format || '',
            schedule: show.schedule || '',
          }}
          onSubmit={handleSubmit}
          submitLabel="Save Changes"
        />
      </div>
    </div>
  )
}

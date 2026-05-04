'use client'

import { useRouter } from 'next/navigation'
import { ClientForm } from '@/components/clients/client-form'

export default function NewClientPage() {
  const router = useRouter()

  async function handleSubmit(data: {
    name: string
    company: string
    email: string
    phone: string
    notes: string
    service_terms: string
  }) {
    const res = await fetch('/api/v1/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const result = await res.json()
    if (!res.ok) {
      throw new Error(result.error || 'Failed to create client')
    }
    router.push(`/app/clients/${result.data.id}`)
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white">Add Client</h1>
      <p className="mt-1 text-sm text-zinc-400">
        Create a new client profile.
      </p>
      <div className="mt-6">
        <ClientForm onSubmit={handleSubmit} submitLabel="Create Client" />
      </div>
    </div>
  )
}

'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function ClientDetailActions({ clientId }: { clientId: string }) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this client? This cannot be undone.')) {
      return
    }
    setDeleting(true)
    try {
      const res = await fetch(`/api/v1/clients/${clientId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        throw new Error('Failed to delete client')
      }
      router.push('/app/clients')
    } catch {
      alert('Failed to delete client. Please try again.')
      setDeleting(false)
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={deleting}
      className="inline-flex items-center rounded-md border border-red-800 bg-red-900/30 px-3 py-2 text-sm font-medium text-red-300 transition-colors hover:bg-red-900/50 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {deleting ? 'Deleting...' : 'Delete'}
    </button>
  )
}

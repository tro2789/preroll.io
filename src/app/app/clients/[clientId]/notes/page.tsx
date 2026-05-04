'use client'

import { use } from 'react'
import Link from 'next/link'
import { NotesList } from '@/components/clients/notes-list'

export default function ClientNotesPage({
  params,
}: {
  params: Promise<{ clientId: string }>
}) {
  const { clientId } = use(params)

  return (
    <div>
      <Link
        href={`/app/clients/${clientId}`}
        className="text-sm text-text-tertiary hover:text-text-secondary transition-colors"
      >
        &larr; Back to Client
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-text-primary">Meeting Notes</h1>
      <div className="mt-6">
        <NotesList clientId={clientId} />
      </div>
    </div>
  )
}

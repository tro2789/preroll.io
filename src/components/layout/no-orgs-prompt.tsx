'use client'

import { useState } from 'react'
import { CreateOrgModal } from './create-org-modal'

export function NoOrgsPrompt() {
  const [createOpen, setCreateOpen] = useState(false)

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-base px-4">
      <div className="w-full max-w-sm text-center space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-widest uppercase text-text-primary">
            PREROLL.IO
          </h1>
          <p className="mt-3 text-sm text-text-secondary">
            Create an organization to get started.
          </p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="w-full rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover transition-colors"
        >
          Create Organization
        </button>
        <CreateOrgModal open={createOpen} onClose={() => setCreateOpen(false)} />
      </div>
    </div>
  )
}

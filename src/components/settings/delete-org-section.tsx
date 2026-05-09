'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface DeleteOrgSectionProps {
  orgName: string
}

export function DeleteOrgSection({ orgName }: DeleteOrgSectionProps) {
  const router = useRouter()
  const [phase, setPhase] = useState<'idle' | 'checking' | 'blockers' | 'confirm' | 'deleting'>('idle')
  const [blockers, setBlockers] = useState<{ members: number; clients: number } | null>(null)
  const [confirmInput, setConfirmInput] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    setPhase('checking')
    setError(null)

    try {
      const res = await fetch('/api/v1/org/delete-check')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to check')

      if (json.data.canDelete) {
        setPhase('confirm')
      } else {
        setBlockers(json.data.blockers)
        setPhase('blockers')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setPhase('idle')
    }
  }

  async function handleConfirmDelete() {
    setPhase('deleting')
    setError(null)

    try {
      const res = await fetch('/api/v1/org/settings', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmName: confirmInput }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to delete')

      router.push('/app')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setPhase('confirm')
    }
  }

  return (
    <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-6">
      <h3 className="text-sm font-semibold text-red-400">Danger Zone</h3>
      <p className="mt-1 text-xs text-text-tertiary">
        Permanently delete this organization and all its data. This cannot be undone.
      </p>

      {error && (
        <div className="mt-4 rounded-md bg-error/10 border border-error/30 px-3 py-2 text-sm text-error">
          {error}
        </div>
      )}

      {phase === 'idle' && (
        <button
          onClick={handleDelete}
          className="mt-4 rounded-md border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/20 transition-colors"
        >
          Delete Organization
        </button>
      )}

      {phase === 'checking' && (
        <p className="mt-4 text-sm text-text-secondary">Checking...</p>
      )}

      {phase === 'blockers' && blockers && (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-text-secondary">
            This organization cannot be deleted yet. Remove the following first:
          </p>
          <ul className="space-y-1 text-sm text-text-secondary">
            {blockers.members > 0 && (
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-red-400 shrink-0" />
                {blockers.members} other team {blockers.members === 1 ? 'member' : 'members'}
              </li>
            )}
            {blockers.clients > 0 && (
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-red-400 shrink-0" />
                {blockers.clients} {blockers.clients === 1 ? 'client' : 'clients'}
              </li>
            )}
          </ul>
          <button
            onClick={() => setPhase('idle')}
            className="text-xs text-text-tertiary hover:text-text-secondary transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      {phase === 'confirm' && (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-text-secondary">
            Type <strong className="text-text-primary">{orgName}</strong> to confirm deletion.
          </p>
          <input
            type="text"
            value={confirmInput}
            onChange={(e) => setConfirmInput(e.target.value)}
            placeholder={orgName}
            className="block w-full rounded-md border border-border-default bg-surface-input px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
          />
          <div className="flex gap-3">
            <button
              onClick={handleConfirmDelete}
              disabled={confirmInput !== orgName}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Permanently Delete
            </button>
            <button
              onClick={() => { setPhase('idle'); setConfirmInput('') }}
              className="rounded-md border border-border-default bg-surface-overlay px-4 py-2 text-sm font-medium text-text-primary hover:bg-surface-input transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {phase === 'deleting' && (
        <p className="mt-4 text-sm text-red-400">Deleting organization...</p>
      )}
    </div>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface ApiKey {
  id: string
  name: string
  last_used_at: string | null
  created_at: string
}

export function ApiKeyList({ keys }: { keys: ApiKey[] }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)
  const [newKey, setNewKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setCreating(true)
    setError(null)
    try {
      const res = await fetch('/api/v1/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Failed to create key')
      }
      const json = await res.json()
      setNewKey(json.data.key)
      setName('')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    await fetch(`/api/v1/api-keys/${id}`, { method: 'DELETE' })
    setDeletingId(null)
    setConfirmDeleteId(null)
    router.refresh()
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div>
      <h2 className="text-xs font-medium uppercase tracking-wider text-text-secondary">
        API Keys
      </h2>
      <p className="mt-1 text-xs text-text-secondary">
        Use API keys to authenticate with the preroll.io API from scripts, the MCP server, or other tools.
      </p>

      {newKey && (
        <div className="mt-4 rounded-lg border border-warning/30 bg-warning/5 p-4">
          <p className="text-sm font-medium text-warning">API key created — copy it now, it won&apos;t be shown again</p>
          <code className="mt-2 block rounded bg-surface-overlay px-3 py-2 font-mono text-xs text-text-primary select-all break-all">
            {newKey}
          </code>
          <button
            onClick={() => { navigator.clipboard.writeText(newKey); setNewKey(null) }}
            className="mt-2 text-xs text-accent hover:text-accent-hover transition-colors"
          >
            Copy &amp; dismiss
          </button>
        </div>
      )}

      <form onSubmit={handleCreate} className="mt-4 flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Key name, e.g. MCP Server"
          className="flex-1 sm:max-w-xs rounded-md border border-border-default bg-surface-input px-3 py-1.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        />
        <button
          type="submit"
          disabled={!name.trim() || creating}
          className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-hover transition-colors disabled:opacity-50 sm:w-auto"
        >
          {creating ? 'Creating...' : 'Create Key'}
        </button>
      </form>

      {error && (
        <p className="mt-2 text-xs text-error">{error}</p>
      )}

      {keys.length === 0 ? (
        <div className="mt-4 rounded-lg border border-border-subtle bg-surface-raised p-8 text-center">
          <p className="text-sm text-text-secondary">No API keys yet.</p>
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {keys.map((k) => (
            <div key={k.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border border-border-subtle bg-surface-raised px-4 sm:px-5 py-3">
              <div>
                <p className="text-sm font-medium text-text-primary">{k.name}</p>
                <p className="text-xs text-text-secondary">
                  Created {formatDate(k.created_at)}
                  {k.last_used_at && <> · Last used {formatDate(k.last_used_at)}</>}
                </p>
              </div>
              {confirmDeleteId === k.id ? (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleDelete(k.id)}
                    disabled={deletingId === k.id}
                    className="rounded-md bg-red-600 px-2 py-0.5 text-xs font-medium text-white hover:bg-red-500 transition-colors disabled:opacity-50"
                  >
                    {deletingId === k.id ? '...' : 'Confirm'}
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(null)}
                    className="text-xs text-text-tertiary hover:text-text-secondary"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDeleteId(k.id)}
                  className="text-xs text-text-tertiary hover:text-red-400 transition-colors"
                >
                  Revoke
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

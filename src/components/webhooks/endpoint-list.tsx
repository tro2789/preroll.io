'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { EndpointForm } from './endpoint-form'
import { DeliveryLog } from './delivery-log'

interface Endpoint {
  id: string
  url: string
  events: string[]
  is_active: boolean
  description: string | null
  created_at: string
  updated_at: string
}

export function WebhookEndpointList({ endpoints }: { endpoints: Endpoint[] }) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [newSecret, setNewSecret] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  async function handleCreate(data: { url: string; events: string[]; description: string }) {
    const res = await fetch('/api/v1/webhook-endpoints', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const json = await res.json()
      throw new Error(json.error || 'Failed to create endpoint')
    }
    const json = await res.json()
    setNewSecret(json.data.secret)
    setShowForm(false)
    router.refresh()
  }

  async function handleUpdate(id: string, data: { url: string; events: string[]; description: string }) {
    const res = await fetch(`/api/v1/webhook-endpoints/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const json = await res.json()
      throw new Error(json.error || 'Failed to update endpoint')
    }
    setEditingId(null)
    router.refresh()
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    await fetch(`/api/v1/webhook-endpoints/${id}`, { method: 'DELETE' })
    setDeletingId(null)
    setConfirmDeleteId(null)
    router.refresh()
  }

  async function handleToggle(id: string, currentActive: boolean) {
    setTogglingId(id)
    await fetch(`/api/v1/webhook-endpoints/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !currentActive }),
    })
    setTogglingId(null)
    router.refresh()
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
          Webhook Endpoints
        </h2>
        <button
          onClick={() => { setShowForm(true); setEditingId(null); setNewSecret(null) }}
          className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-hover transition-colors"
        >
          Add Endpoint
        </button>
      </div>

      {newSecret && (
        <div className="mt-4 rounded-lg border border-warning/30 bg-warning/5 p-4">
          <p className="text-sm font-medium text-warning">Signing secret — copy it now, it won&apos;t be shown again</p>
          <code className="mt-2 block rounded bg-surface-overlay px-3 py-2 font-mono text-xs text-text-primary select-all break-all">
            {newSecret}
          </code>
          <button
            onClick={() => { navigator.clipboard.writeText(newSecret); setNewSecret(null) }}
            className="mt-2 text-xs text-accent hover:text-accent-hover transition-colors"
          >
            Copy &amp; dismiss
          </button>
        </div>
      )}

      {showForm && (
        <div className="mt-4">
          <EndpointForm
            onSubmit={handleCreate}
            onCancel={() => setShowForm(false)}
            submitLabel="Create Endpoint"
          />
        </div>
      )}

      {endpoints.length === 0 && !showForm ? (
        <div className="mt-4 rounded-lg border border-border-subtle bg-surface-raised p-8 text-center">
          <p className="text-sm text-text-secondary">No webhook endpoints configured.</p>
          <p className="mt-1 text-xs text-text-tertiary">
            Add an endpoint to receive real-time notifications when episodes or deliverables change.
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {endpoints.map((ep) => (
            <div key={ep.id} className={`rounded-lg border bg-surface-raised p-5 transition-colors ${
              ep.is_active ? 'border-border-subtle' : 'border-border-subtle opacity-60'
            }`}>
              {editingId === ep.id ? (
                <EndpointForm
                  defaultValues={{ url: ep.url, events: ep.events, description: ep.description || '' }}
                  onSubmit={(data) => handleUpdate(ep.id, data)}
                  onCancel={() => setEditingId(null)}
                  submitLabel="Save Changes"
                />
              ) : (
                <>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <code className="truncate font-mono text-sm text-text-primary">{ep.url}</code>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${
                          ep.is_active
                            ? 'bg-success/10 text-success'
                            : 'bg-surface-overlay text-text-tertiary'
                        }`}>
                          {ep.is_active ? 'Active' : 'Paused'}
                        </span>
                      </div>
                      {ep.description && (
                        <p className="mt-1 text-xs text-text-tertiary">{ep.description}</p>
                      )}
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {ep.events.length === 0 ? (
                          <span className="rounded bg-surface-overlay px-2 py-0.5 text-xs text-text-tertiary">
                            All events
                          </span>
                        ) : (
                          ep.events.map((evt) => (
                            <span key={evt} className="rounded bg-surface-overlay px-2 py-0.5 text-xs text-text-tertiary">
                              {evt}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        onClick={() => handleToggle(ep.id, ep.is_active)}
                        disabled={togglingId === ep.id}
                        className="text-xs text-text-tertiary hover:text-text-secondary transition-colors"
                      >
                        {ep.is_active ? 'Pause' : 'Resume'}
                      </button>
                      <button
                        onClick={() => setEditingId(ep.id)}
                        className="text-xs text-text-tertiary hover:text-text-secondary transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setExpandedId(expandedId === ep.id ? null : ep.id)}
                        className="text-xs text-text-tertiary hover:text-text-secondary transition-colors"
                      >
                        {expandedId === ep.id ? 'Hide Log' : 'Deliveries'}
                      </button>
                      {confirmDeleteId === ep.id ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleDelete(ep.id)}
                            disabled={deletingId === ep.id}
                            className="rounded-md bg-red-600 px-2 py-0.5 text-xs font-medium text-white hover:bg-red-500 transition-colors disabled:opacity-50"
                          >
                            {deletingId === ep.id ? '...' : 'Confirm'}
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
                          onClick={() => setConfirmDeleteId(ep.id)}
                          className="text-xs text-text-tertiary hover:text-red-400 transition-colors"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                  {expandedId === ep.id && (
                    <div className="mt-4 border-t border-border-subtle pt-4">
                      <DeliveryLog endpointId={ep.id} />
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

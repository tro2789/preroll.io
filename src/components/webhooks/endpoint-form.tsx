'use client'

import { useState } from 'react'

const ALL_EVENTS = [
  { value: 'episode.status_changed', label: 'Episode status changed' },
  { value: 'episode.stage_changed', label: 'Episode stage changed' },
  { value: 'episode.published', label: 'Episode published' },
  { value: 'episode.scheduled', label: 'Episode scheduled' },
  { value: 'deliverable.submitted', label: 'Deliverable submitted' },
  { value: 'deliverable.approved', label: 'Deliverable approved' },
  { value: 'deliverable.revision_requested', label: 'Deliverable revision requested' },
  { value: 'deliverable.resubmitted', label: 'Deliverable resubmitted' },
]

interface EndpointFormProps {
  defaultValues?: { url: string; events: string[]; description: string }
  onSubmit: (data: { url: string; events: string[]; description: string }) => Promise<void>
  onCancel: () => void
  submitLabel: string
}

export function EndpointForm({ defaultValues, onSubmit, onCancel, submitLabel }: EndpointFormProps) {
  const [url, setUrl] = useState(defaultValues?.url ?? '')
  const [description, setDescription] = useState(defaultValues?.description ?? '')
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(
    new Set(defaultValues?.events ?? [])
  )
  const [allEvents, setAllEvents] = useState(
    !defaultValues || defaultValues.events.length === 0
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggleEvent(event: string) {
    setSelectedEvents((prev) => {
      const next = new Set(prev)
      if (next.has(event)) next.delete(event)
      else next.add(event)
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await onSubmit({
        url,
        events: allEvents ? [] : Array.from(selectedEvents),
        description,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const inputClass =
    'w-full rounded-md border border-border-default bg-surface-input px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent'
  const labelClass = 'block text-sm font-medium text-text-secondary mb-1'

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-border-subtle bg-surface-base p-5 space-y-4">
      {error && (
        <div className="rounded-md border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="webhook-url" className={labelClass}>
          Endpoint URL <span className="text-error">*</span>
        </label>
        <input
          id="webhook-url"
          type="url"
          required
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className={inputClass}
          placeholder="https://your-server.com/webhook"
        />
      </div>

      <div>
        <label htmlFor="webhook-desc" className={labelClass}>
          Description
        </label>
        <input
          id="webhook-desc"
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={inputClass}
          placeholder="e.g. n8n production workflow"
        />
      </div>

      <div>
        <span className={labelClass}>Events</span>
        <label className="flex items-center gap-2 mt-1">
          <input
            type="checkbox"
            checked={allEvents}
            onChange={(e) => setAllEvents(e.target.checked)}
            className="rounded border-border-default bg-surface-input text-accent focus:ring-accent"
          />
          <span className="text-sm text-text-secondary">All events</span>
        </label>
        {!allEvents && (
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {ALL_EVENTS.map((evt) => (
              <label key={evt.value} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedEvents.has(evt.value)}
                  onChange={() => toggleEvent(evt.value)}
                  className="rounded border-border-default bg-surface-input text-accent focus:ring-accent"
                />
                <span className="text-xs text-text-secondary">{evt.label}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Saving...' : submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-sm text-text-tertiary hover:text-text-secondary transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

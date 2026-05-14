'use client'

import { useState } from 'react'

interface EpisodeSubmitFormProps {
  showId: string
  onSuccess: () => void
  onCancel: () => void
}

export function EpisodeSubmitForm({ showId, onSuccess, onCancel }: EpisodeSubmitFormProps) {
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [links, setLinks] = useState<string[]>([''])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function addLink() {
    setLinks((prev) => [...prev, ''])
  }

  function updateLink(i: number, value: string) {
    setLinks((prev) => prev.map((l, j) => (j === i ? value : l)))
  }

  function removeLink(i: number) {
    setLinks((prev) => prev.filter((_, j) => j !== i))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const trimmedLinks = links.map((l) => l.trim()).filter(Boolean)
    if (!title.trim() && trimmedLinks.length === 0) {
      setError('Provide a title or at least one link.')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/v1/portal/shows/${showId}/episodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim() || undefined,
          notes: notes.trim() || undefined,
          links: trimmedLinks.length > 0 ? trimmedLinks : undefined,
        }),
      })

      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Failed to submit')
      }

      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  const btnPrimary = 'inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover transition-colors disabled:opacity-50'
  const btnSecondary = 'inline-flex items-center gap-1.5 rounded-md border border-border-default bg-surface-overlay px-4 py-2 text-sm font-medium text-text-primary hover:bg-surface-input transition-colors'
  const inputClass = 'w-full rounded-md border border-border-subtle bg-surface-input px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none'

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-border-subtle bg-surface-raised p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary">Submit New Episode</h3>
        <button type="button" onClick={onCancel} className="text-text-tertiary hover:text-text-secondary transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
          </svg>
        </button>
      </div>

      <div>
        <label className="block text-xs font-medium text-text-secondary mb-1.5">
          Title <span className="text-text-tertiary font-normal">(optional)</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Episode title or topic"
          className={inputClass}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-text-secondary mb-1.5">
          Content Links
        </label>
        <div className="space-y-2">
          {links.map((link, i) => (
            <div key={i} className="flex gap-2">
              <input
                type="url"
                value={link}
                onChange={(e) => updateLink(i, e.target.value)}
                placeholder="https://drive.google.com/... or Dropbox link"
                className={inputClass}
              />
              {links.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeLink(i)}
                  className="shrink-0 rounded-md border border-border-subtle p-2 text-text-tertiary hover:text-red-400 hover:border-red-400/30 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                    <path d="M3.75 7.25a.75.75 0 000 1.5h8.5a.75.75 0 000-1.5h-8.5z" />
                  </svg>
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={addLink}
            className="text-xs text-accent hover:text-accent-hover transition-colors font-medium"
          >
            + Add another link
          </button>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-text-secondary mb-1.5">
          Notes <span className="text-text-tertiary font-normal">(optional)</span>
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Guest info, topic, special instructions..."
          rows={3}
          className={inputClass + ' resize-none'}
        />
      </div>

      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}

      <div className="flex items-center gap-2 pt-1">
        <button type="submit" disabled={submitting} className={btnPrimary}>
          {submitting ? 'Submitting...' : 'Submit Episode'}
        </button>
        <button type="button" onClick={onCancel} className={btnSecondary}>
          Cancel
        </button>
      </div>
    </form>
  )
}

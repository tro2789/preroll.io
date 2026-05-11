'use client'

import { useEffect, useState } from 'react'

interface MeetingNote {
  id: string
  title: string | null
  content: string
  meeting_date: string | null
  created_at: string
}

export function NotesList({ clientId }: { clientId: string }) {
  const [notes, setNotes] = useState<MeetingNote[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    meeting_date: '',
    content: '',
  })
  const [submitting, setSubmitting] = useState(false)

  async function fetchNotes() {
    try {
      const res = await fetch(`/api/v1/clients/${clientId}/notes`)
      if (!res.ok) throw new Error('Failed to fetch notes')
      const result = await res.json()
      setNotes(result.data.notes)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const body: Record<string, string> = { content: formData.content }
      if (formData.title) body.title = formData.title
      if (formData.meeting_date) body.meeting_date = formData.meeting_date

      const res = await fetch(`/api/v1/clients/${clientId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const result = await res.json()
        throw new Error(result.error || 'Failed to create note')
      }
      setFormData({ title: '', meeting_date: '', content: '' })
      setShowForm(false)
      await fetchNotes()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(noteId: string) {
    if (!confirm('Delete this note?')) return
    try {
      const res = await fetch(`/api/v1/clients/${clientId}/notes/${noteId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete note')
      setNotes((prev) => prev.filter((n) => n.id !== noteId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete')
    }
  }

  const inputClass =
    'w-full rounded-md border border-border-default bg-surface-input px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent'
  const labelClass = 'block text-sm font-medium text-text-secondary mb-1'

  if (loading) {
    return <p className="text-text-tertiary">Loading notes...</p>
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-text-secondary">
          {notes.length} {notes.length === 1 ? 'note' : 'notes'}
        </p>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
        >
          {showForm ? 'Cancel' : 'Add Note'}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="rounded-lg border border-border-default bg-surface-raised p-4 space-y-4"
        >
          <div>
            <label htmlFor="note-title" className={labelClass}>
              Title
            </label>
            <input
              id="note-title"
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, title: e.target.value }))
              }
              className={inputClass}
              placeholder="Meeting title (optional)"
            />
          </div>
          <div>
            <label htmlFor="note-date" className={labelClass}>
              Meeting Date
            </label>
            <input
              id="note-date"
              type="date"
              value={formData.meeting_date}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, meeting_date: e.target.value }))
              }
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="note-content" className={labelClass}>
              Content <span className="text-error">*</span>
            </label>
            <textarea
              id="note-content"
              rows={4}
              required
              value={formData.content}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, content: e.target.value }))
              }
              className={inputClass}
              placeholder="Meeting notes..."
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Saving...' : 'Save Note'}
          </button>
        </form>
      )}

      {notes.length === 0 && !showForm ? (
        <p className="text-center text-text-tertiary py-8">
          No meeting notes yet. Click &ldquo;Add Note&rdquo; to create one.
        </p>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => {
            const isExpanded = expandedId === note.id
            return (
              <div
                key={note.id}
                className="rounded-lg border border-border-subtle bg-surface-raised"
              >
                <button
                  onClick={() => setExpandedId(isExpanded ? null : note.id)}
                  className="w-full px-4 py-3 text-left flex items-center justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {note.title || 'Untitled'}
                    </p>
                    {note.meeting_date && (
                      <p className="text-xs text-text-secondary mt-0.5">
                        {new Date(note.meeting_date).toLocaleDateString()}
                      </p>
                    )}
                    {!isExpanded && (
                      <p className="text-xs text-text-secondary mt-1 truncate">
                        {note.content.slice(0, 100)}
                        {note.content.length > 100 ? '...' : ''}
                      </p>
                    )}
                  </div>
                  <span className="ml-2 text-text-secondary text-xs shrink-0">
                    {isExpanded ? 'Collapse' : 'Expand'}
                  </span>
                </button>
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-border-subtle pt-3">
                    <p className="text-sm text-text-secondary whitespace-pre-wrap">
                      {note.content}
                    </p>
                    <div className="mt-3 flex justify-end">
                      <button
                        onClick={() => handleDelete(note.id)}
                        className="text-xs text-text-tertiary hover:text-error transition-colors"
                      >
                        Delete Note
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

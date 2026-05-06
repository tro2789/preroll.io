'use client'

import { useState, useRef, useEffect } from 'react'

interface InlineCreateCardProps {
  showId: string
  stageId: string
  onCreated: () => void
}

export function InlineCreateCard({ showId, stageId, onCreated }: InlineCreateCardProps) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || loading) return

    setLoading(true)
    try {
      const res = await fetch(`/api/v1/shows/${showId}/episodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), stage_id: stageId }),
      })
      if (!res.ok) throw new Error('Failed to create')
      setTitle('')
      setEditing(false)
      onCreated()
    } catch {
      // keep form open on error
    } finally {
      setLoading(false)
    }
  }

  function handleCancel() {
    setTitle('')
    setEditing(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') handleCancel()
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="w-full rounded-lg border border-dashed border-border-subtle px-3 py-2 text-xs text-text-tertiary hover:text-text-secondary hover:border-border-default transition-colors"
      >
        + New Episode
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-border-subtle bg-surface-raised p-2.5">
      <input
        ref={inputRef}
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Episode title"
        className="w-full rounded-md border border-border-default bg-surface-input px-2.5 py-1.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
        disabled={loading}
      />
      <div className="flex items-center gap-2 mt-2">
        <button
          type="submit"
          disabled={!title.trim() || loading}
          className="rounded-md bg-accent px-3 py-1 text-xs font-medium text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
        >
          {loading ? 'Adding...' : 'Add'}
        </button>
        <button
          type="button"
          onClick={handleCancel}
          className="text-xs text-text-tertiary hover:text-text-primary transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

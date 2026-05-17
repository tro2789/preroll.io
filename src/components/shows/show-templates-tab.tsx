'use client'

import { useState } from 'react'
import { toast } from 'sonner'

interface ShowTemplatesTabProps {
  showId: string
  initialNotes: string
}

export function ShowTemplatesTab({ showId, initialNotes }: ShowTemplatesTabProps) {
  const [notes, setNotes] = useState(initialNotes)
  const [savedNotes, setSavedNotes] = useState(initialNotes)
  const [saving, setSaving] = useState(false)

  const isDirty = notes !== savedNotes

  async function handleSave() {
    setSaving(true)
    const payload = notes.trim()
      ? { episode_template: { notes: notes.trim() } }
      : { episode_template: null }

    const res = await fetch(`/api/v1/shows/${showId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    setSaving(false)
    if (res.ok) {
      setSavedNotes(notes)
      toast.success('Template saved')
    } else {
      toast.error('Failed to save template')
    }
  }

  const inputClass =
    'w-full rounded-md border border-border-default bg-surface-input px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent'

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-text-primary">Show Notes Template</h3>
        <p className="mt-0.5 text-xs text-text-secondary">
          Define the default structure for episode show notes. New episodes will start with this template, and AI-generated show notes will follow this format.
        </p>
      </div>

      <div>
        <textarea
          rows={10}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className={inputClass}
          placeholder={"## Timestamps\n- 00:00 Intro\n- ...\n\n## Links\n- \n\n## Sponsors\n- "}
        />
        <p className="mt-1 text-xs text-text-secondary">
          Use this for recurring segments, sponsor reads, links sections, etc.
        </p>
      </div>

      <button
        onClick={handleSave}
        disabled={saving || !isDirty}
        className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {saving ? 'Saving...' : 'Save Template'}
      </button>
    </div>
  )
}

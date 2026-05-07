'use client'

import { useState, useEffect } from 'react'

interface EpisodeTemplate {
  description: string
  notes: string
}

const EMPTY: EpisodeTemplate = { description: '', notes: '' }

export function EpisodeTemplateEditor({ showId }: { showId: string }) {
  const [template, setTemplate] = useState<EpisodeTemplate>(EMPTY)
  const [saved, setSaved] = useState<EpisodeTemplate>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle')

  useEffect(() => {
    fetch(`/api/v1/shows/${showId}`)
      .then((r) => r.json())
      .then((json) => {
        const t = json.data?.episode_template || {}
        const loaded = {
          description: t.description || '',
          notes: t.notes || '',
        }
        setTemplate(loaded)
        setSaved(loaded)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [showId])

  const isDirty = template.description !== saved.description || template.notes !== saved.notes

  async function handleSave() {
    setSaving(true)
    setStatus('idle')
    const payload: Record<string, string> = {}
    if (template.description.trim()) payload.description = template.description.trim()
    if (template.notes.trim()) payload.notes = template.notes.trim()

    const res = await fetch(`/api/v1/shows/${showId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ episode_template: Object.keys(payload).length ? payload : null }),
    })
    setSaving(false)
    if (res.ok) {
      setSaved(template)
      setStatus('saved')
      setTimeout(() => setStatus('idle'), 2000)
    } else {
      setStatus('error')
    }
  }

  const inputClass =
    'w-full rounded-md border border-border-default bg-surface-input px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent'
  const labelClass = 'block text-sm font-medium text-text-secondary mb-1'

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-text-primary">Episode Template</h3>
        <p className="mt-0.5 text-xs text-text-tertiary">
          Default values auto-filled when creating new episodes for this show.
        </p>
      </div>

      <div>
        <label className={labelClass}>Default Description</label>
        <textarea
          rows={3}
          value={template.description}
          onChange={(e) => setTemplate((t) => ({ ...t, description: e.target.value }))}
          className={inputClass}
          placeholder="Episode description template..."
        />
      </div>

      <div>
        <label className={labelClass}>Default Show Notes</label>
        <textarea
          rows={6}
          value={template.notes}
          onChange={(e) => setTemplate((t) => ({ ...t, notes: e.target.value }))}
          className={inputClass}
          placeholder={"## Timestamps\n- 00:00 Intro\n- ...\n\n## Links\n- \n\n## Sponsors\n- "}
        />
        <p className="mt-1 text-xs text-text-tertiary">
          Use this for recurring segments, sponsor reads, links sections, etc.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving || loading || !isDirty}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save Template'}
        </button>
        {status === 'saved' && (
          <span className="text-xs text-success">Saved</span>
        )}
        {status === 'error' && (
          <span className="text-xs text-error">Failed to save</span>
        )}
      </div>
    </div>
  )
}

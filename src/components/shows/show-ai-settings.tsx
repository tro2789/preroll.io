'use client'

import { useState } from 'react'
import { ALL_GENERATION_TYPES, GENERATION_LABELS, AI_TONES, AI_LENGTHS } from '@/lib/ai/constants'

interface ShowAiSettingsProps {
  showId: string
  autoTranscribe: boolean
  autoGenerate: string[]
  tone: string | null
  length: string | null
}

export function ShowAiSettings({
  showId,
  autoTranscribe: initialTranscribe,
  autoGenerate: initialGenerate,
  tone: initialTone,
  length: initialLength,
}: ShowAiSettingsProps) {
  const [autoTranscribe, setAutoTranscribe] = useState(initialTranscribe)
  const [autoGenerate, setAutoGenerate] = useState<string[]>(initialGenerate)
  const [tone, setTone] = useState(initialTone || 'professional')
  const [length, setLength] = useState(initialLength || 'standard')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function save(updates: Record<string, unknown>) {
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch(`/api/v1/shows/${showId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    } finally {
      setSaving(false)
    }
  }

  function toggleTranscribe() {
    const next = !autoTranscribe
    setAutoTranscribe(next)
    if (next && autoGenerate.length === 0) {
      const defaults: string[] = ['show_notes', 'title_suggestions']
      setAutoGenerate(defaults)
      save({ ai_auto_transcribe: next, ai_auto_generate: defaults })
    } else {
      save({ ai_auto_transcribe: next })
    }
  }

  function toggleGenType(key: string) {
    const next = autoGenerate.includes(key)
      ? autoGenerate.filter(k => k !== key)
      : [...autoGenerate, key]
    setAutoGenerate(next)
    save({ ai_auto_generate: next })
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-text-primary">AI Pipeline</h3>
        <p className="mt-1 text-xs text-text-secondary">
          Configure automatic transcription and content generation for this show.
        </p>
      </div>

      <div className="space-y-4">
        <label className="flex items-center justify-between">
          <div>
            <span className="text-sm text-text-primary">Auto-transcribe new audio</span>
            <p className="text-xs text-text-secondary mt-0.5">
              Automatically transcribe when audio files are uploaded to episodes.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={autoTranscribe}
            onClick={toggleTranscribe}
            disabled={saving}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
              autoTranscribe ? 'bg-accent' : 'bg-surface-default'
            }`}
          >
            <span
              className={`pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                autoTranscribe ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </label>

        {autoTranscribe && (
          <div className="ml-0 space-y-3 rounded-md border border-border-subtle bg-surface-default p-4">
            <p className="text-xs font-medium text-text-secondary">Auto-generate on transcription:</p>
            {ALL_GENERATION_TYPES.map((key) => (
              <label key={key} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoGenerate.includes(key)}
                  onChange={() => toggleGenType(key)}
                  disabled={saving}
                  className="h-4 w-4 rounded border-border-subtle bg-surface-default text-accent focus:ring-accent focus:ring-offset-0"
                />
                <span className="text-sm text-text-primary">{GENERATION_LABELS[key]}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <p className="text-xs font-medium text-text-secondary">Content style:</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Tone</label>
            <select
              value={tone}
              onChange={(e) => { setTone(e.target.value); save({ ai_tone: e.target.value }) }}
              disabled={saving}
              className="w-full rounded-md border border-border-subtle bg-surface-default px-3 py-1.5 text-sm text-text-primary focus:border-accent focus:outline-none"
            >
              {AI_TONES.map(t => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Length</label>
            <select
              value={length}
              onChange={(e) => { setLength(e.target.value); save({ ai_length: e.target.value }) }}
              disabled={saving}
              className="w-full rounded-md border border-border-subtle bg-surface-default px-3 py-1.5 text-sm text-text-primary focus:border-accent focus:outline-none"
            >
              {AI_LENGTHS.map(l => (
                <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {saved && (
        <p className="text-xs text-emerald-400">Settings saved.</p>
      )}
    </div>
  )
}

'use client'

import { useState } from 'react'

interface ShowFormData {
  name: string
  description: string
  format: string
  schedule: string
}

interface ShowFormProps {
  clientId: string
  defaultValues?: Partial<ShowFormData>
  onSubmit: (data: ShowFormData) => Promise<void>
  submitLabel: string
}

const FORMAT_OPTIONS = [
  { value: '', label: 'Select format...' },
  { value: 'interview', label: 'Interview' },
  { value: 'solo', label: 'Solo' },
  { value: 'panel', label: 'Panel' },
  { value: 'narrative', label: 'Narrative' },
  { value: 'other', label: 'Other' },
]

export function ShowForm({ defaultValues, onSubmit, submitLabel }: ShowFormProps) {
  const [formData, setFormData] = useState<ShowFormData>({
    name: defaultValues?.name ?? '',
    description: defaultValues?.description ?? '',
    format: defaultValues?.format ?? '',
    schedule: defaultValues?.schedule ?? '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await onSubmit(formData)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const inputClass =
    'w-full rounded-md border border-border-default bg-surface-input px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent'
  const labelClass = 'block text-sm font-medium text-text-secondary mb-1'

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-lg">
      {error && (
        <div className="rounded-md border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="name" className={labelClass}>
          Name <span className="text-error">*</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          value={formData.name}
          onChange={handleChange}
          className={inputClass}
          placeholder="Show name"
        />
      </div>

      <div>
        <label htmlFor="description" className={labelClass}>
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          value={formData.description}
          onChange={handleChange}
          className={inputClass}
          placeholder="Brief description of the show..."
        />
      </div>

      <div>
        <label htmlFor="format" className={labelClass}>
          Format
        </label>
        <select
          id="format"
          name="format"
          value={formData.format}
          onChange={handleChange}
          className={inputClass}
        >
          {FORMAT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="schedule" className={labelClass}>
          Schedule
        </label>
        <input
          id="schedule"
          name="schedule"
          type="text"
          value={formData.schedule}
          onChange={handleChange}
          className={inputClass}
          placeholder="e.g. Weekly on Tuesdays"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Saving...' : submitLabel}
      </button>
    </form>
  )
}

'use client'

import { useState } from 'react'

interface Stage {
  id: string
  name: string
  position: number
}

interface EpisodeFormData {
  title: string
  episode_number: string
  description: string
  stage_id: string
  scheduled_publish_date: string
  frame_io_url: string
  notes: string
}

interface EpisodeFormProps {
  showId: string
  stages: Stage[]
  defaultValues?: Partial<EpisodeFormData>
  onSubmit: (data: EpisodeFormData) => Promise<void>
  submitLabel: string
}

export function EpisodeForm({
  stages,
  defaultValues,
  onSubmit,
  submitLabel,
}: EpisodeFormProps) {
  const [formData, setFormData] = useState<EpisodeFormData>({
    title: defaultValues?.title ?? '',
    episode_number: defaultValues?.episode_number ?? '',
    description: defaultValues?.description ?? '',
    stage_id: defaultValues?.stage_id ?? '',
    scheduled_publish_date: defaultValues?.scheduled_publish_date ?? '',
    frame_io_url: defaultValues?.frame_io_url ?? '',
    notes: defaultValues?.notes ?? '',
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
    'w-full rounded-md border border-zinc-600 bg-zinc-700 px-3 py-2 text-sm text-white placeholder-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500'
  const labelClass = 'block text-sm font-medium text-zinc-300 mb-1'

  const sortedStages = [...stages].sort((a, b) => a.position - b.position)

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-lg">
      {error && (
        <div className="rounded-md border border-red-800 bg-red-900/30 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="title" className={labelClass}>
          Title <span className="text-red-400">*</span>
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          value={formData.title}
          onChange={handleChange}
          className={inputClass}
          placeholder="Episode title"
        />
      </div>

      <div>
        <label htmlFor="episode_number" className={labelClass}>
          Episode Number
        </label>
        <input
          id="episode_number"
          name="episode_number"
          type="number"
          value={formData.episode_number}
          onChange={handleChange}
          className={inputClass}
          placeholder="e.g. 1"
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
          placeholder="Episode description..."
        />
      </div>

      <div>
        <label htmlFor="stage_id" className={labelClass}>
          Pipeline Stage
        </label>
        <select
          id="stage_id"
          name="stage_id"
          value={formData.stage_id}
          onChange={handleChange}
          className={inputClass}
        >
          <option value="">Select stage...</option>
          {sortedStages.map((stage) => (
            <option key={stage.id} value={stage.id}>
              {stage.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="scheduled_publish_date" className={labelClass}>
          Scheduled Publish Date
        </label>
        <input
          id="scheduled_publish_date"
          name="scheduled_publish_date"
          type="date"
          value={formData.scheduled_publish_date}
          onChange={handleChange}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="frame_io_url" className={labelClass}>
          Frame.io URL
        </label>
        <input
          id="frame_io_url"
          name="frame_io_url"
          type="url"
          value={formData.frame_io_url}
          onChange={handleChange}
          className={inputClass}
          placeholder="https://app.frame.io/..."
        />
      </div>

      <div>
        <label htmlFor="notes" className={labelClass}>
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          value={formData.notes}
          onChange={handleChange}
          className={inputClass}
          placeholder="Internal notes..."
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Saving...' : submitLabel}
      </button>
    </form>
  )
}

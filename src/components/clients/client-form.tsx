'use client'

import { useState } from 'react'

interface ClientFormData {
  name: string
  company: string
  email: string
  phone: string
  notes: string
  service_terms: string
}

interface ClientFormProps {
  defaultValues?: Partial<ClientFormData>
  onSubmit: (data: ClientFormData) => Promise<void>
  submitLabel: string
}

export function ClientForm({ defaultValues, onSubmit, submitLabel }: ClientFormProps) {
  const [formData, setFormData] = useState<ClientFormData>({
    name: defaultValues?.name ?? '',
    company: defaultValues?.company ?? '',
    email: defaultValues?.email ?? '',
    phone: defaultValues?.phone ?? '',
    notes: defaultValues?.notes ?? '',
    service_terms: defaultValues?.service_terms ?? '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
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
        <div className="rounded-md border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
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
          placeholder="Client name"
        />
      </div>

      <div>
        <label htmlFor="company" className={labelClass}>
          Company
        </label>
        <input
          id="company"
          name="company"
          type="text"
          value={formData.company}
          onChange={handleChange}
          className={inputClass}
          placeholder="Company name"
        />
      </div>

      <div>
        <label htmlFor="email" className={labelClass}>
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          className={inputClass}
          placeholder="client@example.com"
        />
      </div>

      <div>
        <label htmlFor="phone" className={labelClass}>
          Phone
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          value={formData.phone}
          onChange={handleChange}
          className={inputClass}
          placeholder="(555) 123-4567"
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
          placeholder="Any relevant notes about this client..."
        />
      </div>

      <div>
        <label htmlFor="service_terms" className={labelClass}>
          Service Terms
        </label>
        <textarea
          id="service_terms"
          name="service_terms"
          rows={3}
          value={formData.service_terms}
          onChange={handleChange}
          className={inputClass}
          placeholder="Agreed service terms, pricing, deliverables..."
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

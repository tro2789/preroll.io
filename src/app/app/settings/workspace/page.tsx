'use client'

import { useEffect, useState, useRef } from 'react'

interface OrgSettings {
  id: string
  name: string
  slug: string
  logo_url: string | null
}

export default function WorkspacePage() {
  const [settings, setSettings] = useState<OrgSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/v1/org/settings')
      .then((r) => r.json())
      .then((r) => {
        if (r.data) {
          setSettings(r.data)
          setName(r.data.name || '')
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const res = await fetch('/api/v1/org/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to update workspace')
      setSettings((prev) => prev ? { ...prev, ...json.data } : prev)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/v1/org/logo', {
        method: 'POST',
        body: formData,
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Upload failed')
      setSettings((prev) => prev ? { ...prev, logo_url: json.data.logo_url } : prev)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  if (loading) {
    return <div className="text-sm text-text-tertiary">Loading workspace settings...</div>
  }

  if (!settings) {
    return <div className="text-sm text-text-tertiary">Could not load workspace settings.</div>
  }

  return (
    <div className="max-w-lg space-y-8">
      <div>
        <h2 className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
          Workspace Icon
        </h2>
        <div className="mt-4 flex items-center gap-5">
          <div className="relative">
            {settings.logo_url ? (
              <img
                src={settings.logo_url}
                alt={settings.name}
                className="h-16 w-16 rounded-xl object-cover border-2 border-border-default"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-accent/15 text-accent text-xl font-bold border-2 border-border-default">
                {settings.name.charAt(0).toUpperCase()}
              </div>
            )}
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/50">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              </div>
            )}
          </div>
          <div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="rounded-lg border border-border-default bg-surface-overlay px-4 py-2 text-sm font-medium text-text-primary hover:bg-surface-input transition-colors disabled:opacity-50"
            >
              {uploading ? 'Uploading...' : 'Upload Icon'}
            </button>
            <p className="mt-1.5 text-xs text-text-tertiary">
              JPG, PNG, WebP, or SVG. Max 2MB.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/svg+xml"
              onChange={handleLogoUpload}
              className="hidden"
            />
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        <div>
          <label htmlFor="workspace_name" className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
            Workspace Name
          </label>
          <input
            id="workspace_name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Workspace"
            maxLength={100}
            className="mt-2 block w-full rounded-lg border border-border-default bg-surface-input px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>

        {error && (
          <div className="rounded-lg border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-warning">
            {error}
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving || name === settings.name}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          {saved && (
            <span className="text-sm text-success">Saved</span>
          )}
        </div>
      </form>
    </div>
  )
}

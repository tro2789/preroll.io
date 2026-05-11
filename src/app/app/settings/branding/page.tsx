'use client'

import { useEffect, useState, useRef } from 'react'
import { UpgradeGate } from '@/components/ui/upgrade-gate'

interface Branding {
  display_name: string | null
  logo_url: string | null
  accent_color: string | null
}

export default function BrandingPage() {
  const [branding, setBranding] = useState<Branding | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [entitled, setEntitled] = useState(true)

  const [displayName, setDisplayName] = useState('')
  const [accentColor, setAccentColor] = useState('#7c5cbf')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/v1/org/branding')
      .then(async (r) => {
        const json = await r.json()
        const data = json.data
        if (data.entitled === false) {
          setEntitled(false)
          return
        }
        setBranding(data as Branding)
        setDisplayName(data.display_name || '')
        setAccentColor(data.accent_color || '#7c5cbf')
      })
      .catch(() => setError('Failed to load branding'))
      .finally(() => setLoading(false))
  }, [])

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    setError(null)

    try {
      const res = await fetch('/api/v1/org/branding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: displayName.trim(),
          accent_color: accentColor.trim(),
        }),
      })

      if (!res.ok) {
        const json = await res.json()
        if (res.status === 403 && json.error?.includes('White-label')) {
          setEntitled(false)
          return
        }
        setError(json.error || 'Failed to save')
        return
      }

      const json = await res.json()
      setBranding(json.data)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setError('Failed to save branding')
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
      setBranding((prev) => prev ? { ...prev, logo_url: json.data.logo_url } : prev)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  if (loading) {
    return <div className="text-sm text-text-secondary">Loading branding...</div>
  }

  if (!entitled) {
    return (
      <UpgradeGate
        feature="White-Label Branding"
        description="Customize the client portal with your own logo, brand name, and accent color. Available on the Studio plan."
        tier="Studio"
        icon={
          <svg className="h-6 w-6 text-accent" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 0 0-5.78 1.128 2.25 2.25 0 0 1-2.4 2.245 4.5 4.5 0 0 0 8.4-2.245c0-.399-.078-.78-.22-1.128Zm0 0a15.998 15.998 0 0 0 3.388-1.62m-5.043-.025a15.994 15.994 0 0 1 1.622-3.395m3.42 3.42a15.995 15.995 0 0 0 4.764-4.648l3.876-5.814a1.151 1.151 0 0 0-1.597-1.597L14.146 6.32a15.996 15.996 0 0 0-4.649 4.763m3.42 3.42a6.776 6.776 0 0 0-3.42-3.42" />
          </svg>
        }
      />
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">Portal Branding</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Customize what your clients see in the portal.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}

      {saved && (
        <div className="rounded-lg border border-success/30 bg-success/5 px-4 py-3 text-sm text-success">
          Branding saved successfully.
        </div>
      )}

      <div className="rounded-xl border border-border-default bg-surface-raised p-6 space-y-6">
        <div>
          <label htmlFor="display-name" className="block text-sm font-medium text-text-primary">
            Display Name
          </label>
          <p className="mt-1 text-xs text-text-secondary">
            Replaces &quot;preroll.io&quot; in the portal header.
          </p>
          <input
            id="display-name"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your Studio Name"
            className="mt-2 w-full max-w-md rounded-lg border border-border-default bg-surface-input px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary">
            Portal Logo
          </label>
          <p className="mt-1 text-xs text-text-secondary">
            Displayed at 24px height in the portal header. Uses your workspace logo by default.
          </p>
          <div className="mt-3 flex items-center gap-4">
            {branding?.logo_url ? (
              <div className="flex items-center gap-3 rounded-lg border border-border-subtle bg-surface-base px-4 py-3">
                <img
                  src={branding.logo_url}
                  alt="Current logo"
                  className="h-8 w-auto"
                />
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-lg border border-border-subtle border-dashed bg-surface-base px-4 py-3">
                <span className="text-xs text-text-secondary">No logo set</span>
              </div>
            )}
            <div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="rounded-lg border border-border-default bg-surface-overlay px-3 py-1.5 text-sm font-medium text-text-primary hover:bg-surface-input transition-colors disabled:opacity-50"
              >
                {uploading ? 'Uploading...' : branding?.logo_url ? 'Change Logo' : 'Upload Logo'}
              </button>
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

        <div>
          <label htmlFor="accent-color" className="block text-sm font-medium text-text-primary">
            Accent Color
          </label>
          <p className="mt-1 text-xs text-text-secondary">
            Primary brand color used for links, buttons, and highlights in the portal.
          </p>
          <div className="mt-2 flex items-center gap-3">
            <input
              id="accent-color"
              type="color"
              value={accentColor}
              onChange={(e) => setAccentColor(e.target.value)}
              className="h-10 w-10 cursor-pointer rounded-lg border border-border-default bg-transparent p-0.5"
            />
            <input
              type="text"
              value={accentColor}
              onChange={(e) => setAccentColor(e.target.value)}
              placeholder="#7c5cbf"
              className="w-32 rounded-lg border border-border-default bg-surface-input px-3 py-2 text-sm text-text-primary font-mono placeholder:text-text-tertiary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
            <div
              className="h-10 w-10 rounded-lg border border-border-default"
              style={{ backgroundColor: accentColor }}
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border-default bg-surface-raised p-6">
        <h3 className="text-sm font-semibold text-text-primary">Portal Header Preview</h3>
        <div className="mt-4 rounded-lg border border-border-subtle bg-surface-base overflow-hidden">
          <div className="border-b border-border-subtle bg-surface-raised/50 px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-4">
              {branding?.logo_url ? (
                <img
                  src={branding.logo_url}
                  alt="Logo"
                  className="h-6 w-auto"
                />
              ) : (
                <span
                  className="text-sm font-bold tracking-widest uppercase"
                  style={{ color: accentColor || undefined }}
                >
                  {displayName || 'preroll.io'}
                </span>
              )}
              <span className="text-border-default">/</span>
              <span className="text-sm text-text-secondary">Client Name</span>
            </div>
            <span className="text-xs text-text-secondary">client@example.com</span>
          </div>
          <div className="px-4 py-6 text-xs text-text-secondary text-center">
            Portal content area
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Branding'}
        </button>
        {branding && (branding.display_name || branding.logo_url || branding.accent_color) && (
          <button
            onClick={() => {
              setDisplayName('')
              setAccentColor('#7c5cbf')
            }}
            className="rounded-lg border border-border-default bg-surface-overlay px-4 py-2.5 text-sm font-medium text-text-primary hover:bg-surface-input transition-colors"
          >
            Reset to Defaults
          </button>
        )}
      </div>
    </div>
  )
}

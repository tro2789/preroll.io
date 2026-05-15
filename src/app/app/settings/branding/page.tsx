'use client'

import { useEffect, useState, useRef } from 'react'
import { resolveAssetUrl } from '@/lib/r2/resolve'
import { ImageUploadField } from '@/components/settings/image-upload-field'
import { UpgradeGate } from '@/components/ui/upgrade-gate'

interface OrgSettings {
  id: string
  name: string
  slug: string
  logo_url: string | null
  role?: string
  allow_client_downloads?: boolean
}

interface Branding {
  display_name: string | null
  logo_url: string | null
  accent_color: string | null
  portal_custom_css: string | null
  entitled: boolean
}

export default function BrandingPage() {
  const [org, setOrg] = useState<OrgSettings | null>(null)
  const [branding, setBranding] = useState<Branding | null>(null)
  const [loading, setLoading] = useState(true)

  // Workspace state
  const [orgName, setOrgName] = useState('')
  const [savingOrg, setSavingOrg] = useState(false)
  const [orgSaved, setOrgSaved] = useState(false)
  const [orgError, setOrgError] = useState<string | null>(null)
  const [allowDownloads, setAllowDownloads] = useState(true)

  // Portal branding state
  const [displayName, setDisplayName] = useState('')
  const [accentColor, setAccentColor] = useState('#e86a47')
  const [customCss, setCustomCss] = useState('')
  const [savingBranding, setSavingBranding] = useState(false)
  const [brandingSaved, setBrandingSaved] = useState(false)
  const [brandingError, setBrandingError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/v1/org/settings').then((r) => r.json()),
      fetch('/api/v1/org/branding').then((r) => r.json()),
    ])
      .then(([orgRes, brandingRes]) => {
        if (orgRes.data) {
          setOrg(orgRes.data)
          setOrgName(orgRes.data.name || '')
          setAllowDownloads(orgRes.data.allow_client_downloads !== false)
        }
        if (brandingRes.data) {
          setBranding(brandingRes.data as Branding)
          setDisplayName(brandingRes.data.display_name || '')
          setAccentColor(brandingRes.data.accent_color || '#e86a47')
          setCustomCss(brandingRes.data.portal_custom_css || '')
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleOrgSave(e: React.FormEvent) {
    e.preventDefault()
    setSavingOrg(true)
    setOrgError(null)
    setOrgSaved(false)
    try {
      const res = await fetch('/api/v1/org/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: orgName }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to update workspace')
      setOrg((prev) => (prev ? { ...prev, ...json.data } : prev))
      setOrgSaved(true)
      setTimeout(() => setOrgSaved(false), 3000)
    } catch (err) {
      setOrgError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSavingOrg(false)
    }
  }

  async function handleLogoUpload(file: File) {
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch('/api/v1/org/logo', {
      method: 'POST',
      body: formData,
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Upload failed')
    setOrg((prev) => (prev ? { ...prev, logo_url: json.data.logo_url } : prev))
    setBranding((prev) => (prev ? { ...prev, logo_url: json.data.logo_url } : prev))
  }

  async function handlePortalLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setBrandingError(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/v1/org/logo', {
        method: 'POST',
        body: formData,
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Upload failed')
      setBranding((prev) => (prev ? { ...prev, logo_url: json.data.logo_url } : prev))
      setOrg((prev) => (prev ? { ...prev, logo_url: json.data.logo_url } : prev))
    } catch (err) {
      setBrandingError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleBrandingSave() {
    setSavingBranding(true)
    setBrandingSaved(false)
    setBrandingError(null)
    try {
      const res = await fetch('/api/v1/org/branding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: displayName.trim(),
          accent_color: accentColor.trim(),
          portal_custom_css: customCss.trim(),
        }),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Failed to save')
      }
      const json = await res.json()
      setBranding((prev) => (prev ? { ...prev, ...json.data } : prev))
      setBrandingSaved(true)
      setTimeout(() => setBrandingSaved(false), 3000)
    } catch (err) {
      setBrandingError(err instanceof Error ? err.message : 'Failed to save branding')
    } finally {
      setSavingBranding(false)
    }
  }

  if (loading) {
    return <div className="text-sm text-text-secondary">Loading branding settings...</div>
  }

  const entitled = branding?.entitled ?? false

  return (
    <div className="max-w-2xl space-y-10">
      {/* Workspace Section — ungated */}
      {org && (
        <section>
          <h2 className="text-lg font-semibold text-text-primary">Workspace</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Your workspace identity across PreRoll.
          </p>

          <div className="mt-6">
            <ImageUploadField
              label="Workspace Icon"
              currentUrl={resolveAssetUrl(org.logo_url)}
              fallbackInitial={org.name}
              onUpload={handleLogoUpload}
              accept="image/jpeg,image/png,image/webp,image/svg+xml"
              hint="JPG, PNG, WebP, or SVG. Max 2MB."
              shape="rounded"
              size="sm"
            />
          </div>

          <form onSubmit={handleOrgSave} className="mt-6 space-y-5">
            <div>
              <label
                htmlFor="workspace_name"
                className="text-xs font-medium uppercase tracking-wider text-text-secondary"
              >
                Workspace Name
              </label>
              <input
                id="workspace_name"
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="My Workspace"
                maxLength={100}
                className="mt-2 block w-full max-w-md rounded-lg border border-border-default bg-surface-input px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>

            {orgError && (
              <div className="rounded-lg border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-warning">
                {orgError}
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={savingOrg || orgName === org.name}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
              >
                {savingOrg ? 'Saving...' : 'Save Changes'}
              </button>
              {orgSaved && <span className="text-sm text-success">Saved</span>}
            </div>
          </form>
        </section>
      )}

      <div className="border-t border-border-default" />

      {/* Client Portal Settings — ungated */}
      {org && (
        <section>
          <h2 className="text-lg font-semibold text-text-primary">Client Portal</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Control what clients can do in their portal.
          </p>

          <div className="mt-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-primary">Allow clients to download deliverables</p>
              <p className="mt-0.5 text-xs text-text-secondary">When enabled, clients can download files from deliverable cards in their portal.</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={allowDownloads}
              aria-label="Allow clients to download deliverables"
              onClick={async () => {
                const prev = allowDownloads
                const next = !prev
                setAllowDownloads(next)
                const res = await fetch('/api/v1/org/settings', {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ allow_client_downloads: next }),
                })
                if (!res.ok) {
                  setAllowDownloads(prev)
                  const json = await res.json().catch(() => ({}))
                  setOrgError(json.error || 'Failed to update download setting')
                }
              }}
              className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-surface-base ${allowDownloads ? 'bg-accent' : 'bg-border-default'}`}
            >
              <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${allowDownloads ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>
        </section>
      )}

      <div className="border-t border-border-default" />

      {/* Portal Branding — Studio-gated */}
      {!entitled ? (
        <UpgradeGate
          feature="Portal Branding"
          description="Customize the client portal with your own logo, brand name, accent color, and custom CSS. Available on the Studio plan."
          tier="Studio"
          icon={
            <svg className="h-6 w-6 text-accent" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 0 0-5.78 1.128 2.25 2.25 0 0 1-2.4 2.245 4.5 4.5 0 0 0 8.4-2.245c0-.399-.078-.78-.22-1.128Zm0 0a15.998 15.998 0 0 0 3.388-1.62m-5.043-.025a15.994 15.994 0 0 1 1.622-3.395m3.42 3.42a15.995 15.995 0 0 0 4.764-4.648l3.876-5.814a1.151 1.151 0 0 0-1.597-1.597L14.146 6.32a15.996 15.996 0 0 0-4.649 4.763m3.42 3.42a6.776 6.776 0 0 0-3.42-3.42" />
            </svg>
          }
        />
      ) : (
        <section className="space-y-8">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Portal Branding</h2>
            <p className="mt-1 text-sm text-text-secondary">
              Customize what your clients see in the portal.
            </p>
          </div>

          {brandingError && (
            <div className="rounded-lg border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">
              {brandingError}
            </div>
          )}

          {brandingSaved && (
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
                Displayed at 24px height in the portal header. Uses your workspace icon by default.
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
                    onChange={handlePortalLogoUpload}
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
                  placeholder="#e86a47"
                  className="w-32 rounded-lg border border-border-default bg-surface-input px-3 py-2 text-sm text-text-primary font-mono placeholder:text-text-tertiary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                />
                <div
                  className="h-10 w-10 rounded-lg border border-border-default"
                  style={{ backgroundColor: accentColor }}
                />
              </div>
            </div>

            <div>
              <label htmlFor="custom-css" className="block text-sm font-medium text-text-primary">
                Custom CSS
              </label>
              <p className="mt-1 text-xs text-text-secondary">
                Inject custom styles into the client portal. Use this for custom fonts, layout tweaks, or advanced branding.
              </p>
              <textarea
                id="custom-css"
                value={customCss}
                onChange={(e) => setCustomCss(e.target.value)}
                placeholder={`/* Example: import a custom font */\n@import url('https://fonts.googleapis.com/css2?family=Inter&display=swap');\n\nbody { font-family: 'Inter', sans-serif; }`}
                rows={6}
                maxLength={10000}
                className="mt-2 w-full rounded-lg border border-border-default bg-surface-input px-3 py-2 text-sm text-text-primary font-mono placeholder:text-text-tertiary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent resize-y"
              />
              <p className="mt-1.5 text-xs text-text-secondary">
                {customCss.length.toLocaleString()} / 10,000 characters
              </p>
            </div>
          </div>

          {/* Portal Header Preview */}
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
              onClick={handleBrandingSave}
              disabled={savingBranding}
              className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
            >
              {savingBranding ? 'Saving...' : 'Save Branding'}
            </button>
            {branding && (branding.display_name || branding.logo_url || branding.accent_color || branding.portal_custom_css) && (
              <button
                onClick={() => {
                  setDisplayName('')
                  setAccentColor('#e86a47')
                  setCustomCss('')
                }}
                className="rounded-lg border border-border-default bg-surface-overlay px-4 py-2.5 text-sm font-medium text-text-primary hover:bg-surface-input transition-colors"
              >
                Reset to Defaults
              </button>
            )}
          </div>
        </section>
      )}
    </div>
  )
}

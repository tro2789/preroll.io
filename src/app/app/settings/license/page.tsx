'use client'

import { useEffect, useState } from 'react'
import type { LicenseInfo } from '@/lib/license'

interface LicenseStatus {
  self_hosted: boolean
  registered: boolean
  info: LicenseInfo | null
}

export default function LicensePage() {
  const [status, setStatus] = useState<LicenseStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [orgName, setOrgName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [licenseKey, setLicenseKey] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/v1/license')
      .then((r) => r.json())
      .then((r) => setStatus(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      const res = await fetch('/api/v1/license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, org_name: orgName }),
      })
      const result = await res.json()

      if (!res.ok) {
        setError(result.error || 'Registration failed')
        return
      }

      setLicenseKey(result.data.key)
      setStatus({
        self_hosted: true,
        registered: true,
        info: result.data.info,
      })
    } catch {
      setError('Registration failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="text-sm text-text-tertiary">Loading license status...</div>
  }

  if (!status?.self_hosted) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-text-primary">License</h2>
        <div className="rounded-xl border border-border-default bg-surface-raised p-6">
          <p className="text-sm text-text-secondary">
            License keys are for self-hosted installations. This instance is running as a managed
            service.
          </p>
          <a
            href="https://preroll.io/docs/self-hosting"
            className="mt-3 inline-block text-sm font-medium text-accent hover:text-accent-hover transition-colors"
          >
            Learn about self-hosting &rarr;
          </a>
        </div>
      </div>
    )
  }

  if (status.registered && status.info) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-text-primary">License</h2>
        <div className="rounded-xl border border-border-default bg-surface-raised p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success/10">
              <svg
                className="h-4 w-4 text-success"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-text-primary">Registered</p>
              <p className="text-xs text-text-tertiary">All features unlocked</p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <div>
              <p className="text-xs font-medium text-text-tertiary">Email</p>
              <p className="text-sm text-text-secondary">{status.info.email}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-text-tertiary">Organization</p>
              <p className="text-sm text-text-secondary">{status.info.orgName}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-text-tertiary">Registered</p>
              <p className="text-sm text-text-secondary">
                {new Date(status.info.issuedAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          {licenseKey && (
            <div className="mt-5 rounded-lg border border-border-default bg-surface-overlay p-3">
              <p className="text-xs font-medium text-text-tertiary">License Key</p>
              <p className="mt-1 break-all font-mono text-xs text-text-secondary">{licenseKey}</p>
              <p className="mt-2 text-xs text-text-tertiary">
                Save this key. You can set it as <code className="text-text-secondary">PREROLL_LICENSE_KEY</code> in your environment for validation at startup.
              </p>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-text-primary">License</h2>
      <div className="rounded-xl border border-border-default bg-surface-raised p-6">
        <p className="text-sm text-text-secondary">
          Register your self-hosted installation. All features work without a license key — registration enables update notifications and helps us understand how PreRoll is being used.
        </p>

        <form onSubmit={handleRegister} className="mt-5 space-y-4">
          <div>
            <label htmlFor="license-email" className="block text-xs font-medium text-text-tertiary">
              Email
            </label>
            <input
              id="license-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-1 block w-full rounded-lg border border-border-default bg-surface-input px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
          <div>
            <label htmlFor="license-org" className="block text-xs font-medium text-text-tertiary">
              Organization Name
            </label>
            <input
              id="license-org"
              type="text"
              required
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="Your Company"
              className="mt-1 block w-full rounded-lg border border-border-default bg-surface-input px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          {error && (
            <p className="text-sm text-error">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            {submitting ? 'Registering...' : 'Register'}
          </button>
        </form>
      </div>
    </div>
  )
}

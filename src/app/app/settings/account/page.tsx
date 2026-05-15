'use client'

import { useEffect, useState } from 'react'
import { resolveAssetUrl } from '@/lib/r2/resolve'
import { ImageUploadField } from '@/components/settings/image-upload-field'
import { DeleteOrgSection } from '@/components/settings/delete-org-section'

interface Profile {
  id: string
  email: string
  display_name: string | null
  avatar_url: string | null
}

interface OrgSettings {
  id: string
  name: string
  role?: string
}

export default function AccountPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [org, setOrg] = useState<OrgSettings | null>(null)
  const [loading, setLoading] = useState(true)

  const [displayName, setDisplayName] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/v1/profile').then((r) => r.json()),
      fetch('/api/v1/org/settings').then((r) => r.json()),
    ])
      .then(([profileRes, orgRes]) => {
        if (profileRes.data) {
          setProfile(profileRes.data)
          setDisplayName(profileRes.data.display_name || '')
        }
        if (orgRes.data) {
          setOrg(orgRes.data)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault()
    setSavingProfile(true)
    setProfileError(null)
    setProfileSaved(false)
    try {
      const res = await fetch('/api/v1/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: displayName }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to update profile')
      setProfile((prev) => (prev ? { ...prev, ...json.data } : prev))
      setProfileSaved(true)
      setTimeout(() => setProfileSaved(false), 3000)
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSavingProfile(false)
    }
  }

  async function handleAvatarUpload(file: File) {
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch('/api/v1/profile/avatar', {
      method: 'POST',
      body: formData,
    })
    if (!res.ok) {
      const json = await res.json()
      throw new Error(json.error || 'Upload failed')
    }
    const { data } = await res.json()
    setProfile((prev) => (prev ? { ...prev, avatar_url: data.avatar_url } : prev))
  }

  if (loading) {
    return <div className="text-sm text-text-secondary">Loading account settings...</div>
  }

  return (
    <div className="max-w-lg space-y-10">
      {/* Profile Section */}
      {profile && (
        <section>
          <ImageUploadField
            label="Profile Picture"
            currentUrl={resolveAssetUrl(profile.avatar_url)}
            fallbackInitial={profile.display_name || profile.email || '?'}
            onUpload={handleAvatarUpload}
          />

          <form onSubmit={handleProfileSave} className="mt-6 space-y-5">
            <div>
              <label
                htmlFor="display_name"
                className="text-xs font-medium uppercase tracking-wider text-text-secondary"
              >
                Display Name
              </label>
              <input
                id="display_name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                maxLength={100}
                className="mt-2 block w-full rounded-lg border border-border-default bg-surface-input px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>

            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-text-secondary">
                Email
              </label>
              <p className="mt-2 text-sm text-text-secondary">{profile.email}</p>
              <p className="mt-1 text-xs text-text-secondary">
                Email is managed through your authentication provider.
              </p>
            </div>

            {profileError && (
              <div className="rounded-lg border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-warning">
                {profileError}
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={savingProfile || displayName === (profile.display_name || '')}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
              >
                {savingProfile ? 'Saving...' : 'Save Changes'}
              </button>
              {profileSaved && <span className="text-sm text-success">Saved</span>}
            </div>
          </form>
        </section>
      )}

      {org && org.role === 'owner' && (
        <>
          <div className="border-t border-border-default" />
          <section>
            <DeleteOrgSection orgName={org.name} />
          </section>
        </>
      )}
    </div>
  )
}

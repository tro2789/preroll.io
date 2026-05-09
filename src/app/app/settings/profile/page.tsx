'use client'

import { useEffect, useState, useRef } from 'react'
import { resolveAssetUrl } from '@/lib/r2/resolve'

interface Profile {
  id: string
  email: string
  display_name: string | null
  avatar_url: string | null
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [displayName, setDisplayName] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/v1/profile')
      .then((r) => r.json())
      .then((r) => {
        if (r.data) {
          setProfile(r.data)
          setDisplayName(r.data.display_name || '')
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
      const res = await fetch('/api/v1/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: displayName }),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Failed to update profile')
      }
      const { data } = await res.json()
      setProfile((prev) => prev ? { ...prev, ...data } : prev)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError(null)
    try {
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
      setProfile((prev) => prev ? { ...prev, avatar_url: data.avatar_url } : prev)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  if (loading) {
    return <div className="text-sm text-text-tertiary">Loading profile...</div>
  }

  if (!profile) {
    return <div className="text-sm text-text-tertiary">Could not load profile.</div>
  }

  const avatarSrc = resolveAssetUrl(profile.avatar_url)

  return (
    <div className="max-w-lg space-y-8">
      <div>
        <h2 className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
          Profile Picture
        </h2>
        <div className="mt-4 flex items-center gap-5">
          <div className="relative">
            {avatarSrc ? (
              <img
                src={avatarSrc}
                alt={profile.display_name || 'Avatar'}
                className="h-20 w-20 rounded-full object-cover border-2 border-border-default"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-accent/15 text-accent text-2xl font-bold border-2 border-border-default">
                {(profile.display_name || profile.email || '?').charAt(0).toUpperCase()}
              </div>
            )}
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
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
              {uploading ? 'Uploading...' : 'Upload Photo'}
            </button>
            <p className="mt-1.5 text-xs text-text-tertiary">
              JPG, PNG, or WebP. Max 2MB.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleAvatarUpload}
              className="hidden"
            />
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        <div>
          <label htmlFor="display_name" className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
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
          <label className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
            Email
          </label>
          <p className="mt-2 text-sm text-text-secondary">{profile.email}</p>
          <p className="mt-1 text-xs text-text-tertiary">
            Email is managed through your authentication provider.
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-warning">
            {error}
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving || displayName === (profile.display_name || '')}
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

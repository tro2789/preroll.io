'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface UserActionsProps {
  userId: string
  isSuperAdmin: boolean
}

export function UserActions({ userId, isSuperAdmin }: UserActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  async function grantSuperAdmin() {
    setLoading('grant')
    try {
      const res = await fetch('/api/v1/admin/super-admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || 'Failed to grant super admin.')
      }
      toast.success('Super admin granted.')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(null)
    }
  }

  async function revokeSuperAdmin() {
    setLoading('revoke')
    try {
      const res = await fetch(`/api/v1/admin/super-admins/${userId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || 'Failed to revoke super admin.')
      }
      toast.success('Super admin revoked.')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(null)
    }
  }

  async function sendMagicLink() {
    setLoading('magic')
    try {
      const res = await fetch(`/api/v1/admin/users/${userId}/magic-link`, {
        method: 'POST',
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || 'Failed to send magic link.')
      }
      toast.success('Magic link sent.')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(null)
    }
  }

  const grantBtn =
    'rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-hover transition-colors disabled:opacity-50'
  const revokeBtn =
    'rounded-md border border-error/30 bg-error/5 px-3 py-1.5 text-xs font-semibold text-error hover:bg-error/10 transition-colors disabled:opacity-50'
  const outlineBtn =
    'rounded-md border border-border-default bg-surface-base px-3 py-1.5 text-xs font-semibold text-text-primary hover:bg-surface-raised transition-colors disabled:opacity-50'

  return (
    <div className="flex flex-wrap items-center gap-2">
      {isSuperAdmin ? (
        <button
          className={revokeBtn}
          disabled={loading !== null}
          onClick={revokeSuperAdmin}
        >
          {loading === 'revoke' ? 'Revoking...' : 'Revoke Super Admin'}
        </button>
      ) : (
        <button
          className={grantBtn}
          disabled={loading !== null}
          onClick={grantSuperAdmin}
        >
          {loading === 'grant' ? 'Granting...' : 'Grant Super Admin'}
        </button>
      )}

      <button
        className={outlineBtn}
        disabled={loading !== null}
        onClick={sendMagicLink}
      >
        {loading === 'magic' ? 'Sending...' : 'Send Magic Link'}
      </button>
    </div>
  )
}

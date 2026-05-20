'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'

const btnBase = 'rounded-md px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50'
const btnPrimary = `${btnBase} bg-accent text-white hover:bg-accent-hover`
const btnOutline = `${btnBase} border border-border-default bg-surface-base text-text-primary hover:bg-surface-raised`
const btnDanger = `${btnBase} border border-error/30 bg-error/5 text-error hover:bg-error/10`

interface UserActionsProps {
  userId: string
  isSuperAdmin: boolean
}

export function UserActions({ userId, isSuperAdmin }: UserActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [confirmAction, setConfirmAction] = useState<{
    label: string
    action: () => void
    message: string
  } | null>(null)

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

  async function impersonate() {
    setLoading('impersonate')
    try {
      const res = await fetch(`/api/v1/admin/users/${userId}/impersonate`, {
        method: 'POST',
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || 'Failed to generate impersonation link.')
      }
      const data = await res.json()
      window.open(data.data.url, '_blank')
      toast.success('Opening session in new tab...')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(null)
    }
  }

  async function deleteUser() {
    setLoading('Delete User')
    try {
      const res = await fetch(`/api/v1/admin/users/${userId}/delete`, {
        method: 'POST',
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || 'Failed to delete user')
      }
      toast.success('User deleted')
      router.push('/admin/users')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Access */}
      <div>
        <p className="text-xs font-medium text-text-secondary mb-2">Access</p>
        <div className="flex flex-wrap gap-2">
          {isSuperAdmin ? (
            <button
              className={btnDanger}
              disabled={loading !== null}
              onClick={() =>
                setConfirmAction({
                  label: 'Revoke Super Admin',
                  action: revokeSuperAdmin,
                  message:
                    'This will revoke super admin access. The user will lose all platform admin privileges. Are you sure?',
                })
              }
            >
              {loading === 'revoke' ? 'Revoking...' : 'Revoke Super Admin'}
            </button>
          ) : (
            <button
              className={btnPrimary}
              disabled={loading !== null}
              onClick={grantSuperAdmin}
            >
              {loading === 'grant' ? 'Granting...' : 'Grant Super Admin'}
            </button>
          )}
          <button
            className={btnOutline}
            disabled={loading !== null}
            onClick={impersonate}
          >
            {loading === 'impersonate' ? 'Opening...' : 'Login As'}
          </button>
        </div>
      </div>

      {/* Authentication */}
      <div>
        <p className="text-xs font-medium text-text-secondary mb-2">Authentication</p>
        <div className="flex flex-wrap gap-2">
          <button
            className={btnOutline}
            disabled={loading !== null}
            onClick={sendMagicLink}
          >
            {loading === 'magic' ? 'Sending...' : 'Send Magic Link'}
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div>
        <p className="text-xs font-medium text-text-secondary mb-2">Danger Zone</p>
        <div className="flex flex-wrap gap-2">
          <button
            className={btnDanger}
            disabled={loading !== null}
            onClick={() =>
              setConfirmAction({
                label: 'Delete User',
                action: deleteUser,
                message:
                  'This will permanently delete this user account and remove them from all organizations. This cannot be undone.',
              })
            }
          >
            {loading === 'Delete User' ? 'Deleting...' : 'Delete User'}
          </button>
        </div>
      </div>

      <Dialog open={confirmAction !== null} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Action</DialogTitle>
            <DialogDescription>{confirmAction?.message}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button onClick={() => setConfirmAction(null)} className={btnOutline}>
              Cancel
            </button>
            <button
              onClick={() => {
                confirmAction!.action()
                setConfirmAction(null)
              }}
              className={`${btnBase} bg-error text-white hover:bg-error/90`}
              disabled={loading !== null}
            >
              {loading ? 'Processing...' : 'Confirm'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

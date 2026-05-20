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

interface OrgActionsProps {
  orgId: string
  currentPlan: string
  trialEndsAt: string | null
  aiEnabled: boolean
}

export function OrgActions({ orgId, currentPlan, trialEndsAt, aiEnabled }: OrgActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [confirmAction, setConfirmAction] = useState<{
    label: string
    action: () => void
    message: string
  } | null>(null)

  async function patchOrg(label: string, body: Record<string, unknown>) {
    setLoading(label)
    try {
      const res = await fetch(`/api/v1/admin/orgs/${orgId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || `Failed to update organization`)
      }
      toast.success(`${label} applied successfully.`)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(null)
    }
  }

  async function grantCredits(label: string, amount: number) {
    setLoading(label)
    try {
      const res = await fetch(`/api/v1/admin/orgs/${orgId}/credits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || 'Failed to grant credits')
      }
      const data = await res.json()
      toast.success(`Granted ${amount} credits. New balance: ${data.data.credits_balance}`)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(null)
    }
  }

  async function deleteOrg() {
    setLoading('Delete Organization')
    try {
      const res = await fetch(`/api/v1/admin/orgs/${orgId}/delete`, {
        method: 'POST',
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || 'Failed to delete organization')
      }
      toast.success('Organization deleted')
      router.push('/admin/orgs')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Plan */}
      <div>
        <p className="text-xs font-medium text-text-secondary mb-2">Plan</p>
        <div className="flex flex-wrap gap-2">
          {currentPlan !== 'free' && (
            <button
              className={btnDanger}
              disabled={loading !== null}
              onClick={() =>
                setConfirmAction({
                  label: 'Set Free',
                  action: () => patchOrg('Set Free', { plan_id: 'free' }),
                  message: 'This will downgrade to the Free plan. Are you sure?',
                })
              }
            >
              {loading === 'Set Free' ? 'Updating...' : 'Set Free'}
            </button>
          )}
          {currentPlan !== 'pro' && (
            <button
              className={btnPrimary}
              disabled={loading !== null}
              onClick={() => patchOrg('Set Pro', { plan_id: 'pro' })}
            >
              {loading === 'Set Pro' ? 'Updating...' : 'Set Pro'}
            </button>
          )}
          {currentPlan !== 'studio' && (
            <button
              className={btnPrimary}
              disabled={loading !== null}
              onClick={() => patchOrg('Set Studio', { plan_id: 'studio' })}
            >
              {loading === 'Set Studio' ? 'Updating...' : 'Set Studio'}
            </button>
          )}
        </div>
      </div>

      {/* Trial */}
      <div>
        <p className="text-xs font-medium text-text-secondary mb-2">Trial</p>
        <div className="flex flex-wrap gap-2">
          <button
            className={btnOutline}
            disabled={loading !== null}
            onClick={() =>
              patchOrg('+7 day trial', {
                trial_ends_at: new Date(
                  Date.now() + 7 * 24 * 60 * 60 * 1000
                ).toISOString(),
              })
            }
          >
            {loading === '+7 day trial' ? 'Updating...' : '+7 day trial'}
          </button>
          <button
            className={btnOutline}
            disabled={loading !== null}
            onClick={() =>
              patchOrg('+30 day trial', {
                trial_ends_at: new Date(
                  Date.now() + 30 * 24 * 60 * 60 * 1000
                ).toISOString(),
              })
            }
          >
            {loading === '+30 day trial' ? 'Updating...' : '+30 day trial'}
          </button>
          {trialEndsAt && (
            <button
              className={btnDanger}
              disabled={loading !== null}
              onClick={() =>
                setConfirmAction({
                  label: 'End trial',
                  action: () => patchOrg('End trial', { trial_ends_at: null }),
                  message: 'This will end the trial immediately. Are you sure?',
                })
              }
            >
              {loading === 'End trial' ? 'Updating...' : 'End trial'}
            </button>
          )}
        </div>
      </div>

      {/* AI Credits */}
      <div>
        <p className="text-xs font-medium text-text-secondary mb-2">AI Credits</p>
        <div className="flex flex-wrap gap-2">
          <button
            className={btnOutline}
            disabled={loading !== null || !aiEnabled}
            title={!aiEnabled ? 'AI add-on not enabled for this org' : undefined}
            onClick={() => grantCredits('Grant 100', 100)}
          >
            {loading === 'Grant 100' ? 'Granting...' : 'Grant 100 Credits'}
          </button>
          <button
            className={btnOutline}
            disabled={loading !== null || !aiEnabled}
            title={!aiEnabled ? 'AI add-on not enabled for this org' : undefined}
            onClick={() => grantCredits('Grant 500', 500)}
          >
            {loading === 'Grant 500' ? 'Granting...' : 'Grant 500 Credits'}
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
                label: 'Delete Organization',
                action: deleteOrg,
                message:
                  'This will permanently delete this organization and all its data (clients, shows, episodes, files). This cannot be undone.',
              })
            }
          >
            {loading === 'Delete Organization' ? 'Deleting...' : 'Delete Organization'}
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

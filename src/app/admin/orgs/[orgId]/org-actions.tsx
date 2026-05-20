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
    body: Record<string, unknown>
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

  const planBtnBase =
    'rounded-md px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50'
  const outlineBtn = `${planBtnBase} border border-border-default bg-surface-base text-text-primary hover:bg-surface-raised`
  const dangerBtn = `${planBtnBase} border border-error/30 bg-error/5 text-error hover:bg-error/10`

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Plan buttons */}
      {currentPlan !== 'free' && (
        <button
          className={outlineBtn}
          disabled={loading !== null}
          onClick={() =>
            setConfirmAction({
              label: 'Set Free',
              body: { plan_id: 'free' },
              message: 'This will downgrade to the Free plan. Are you sure?',
            })
          }
        >
          {loading === 'Set Free' ? 'Updating...' : 'Set Free'}
        </button>
      )}
      {currentPlan !== 'pro' && (
        <button
          className={`${planBtnBase} bg-accent text-white hover:bg-accent-hover`}
          disabled={loading !== null}
          onClick={() => patchOrg('Set Pro', { plan_id: 'pro' })}
        >
          {loading === 'Set Pro' ? 'Updating...' : 'Set Pro'}
        </button>
      )}
      {currentPlan !== 'studio' && (
        <button
          className={`${planBtnBase} bg-purple-600 text-white hover:bg-purple-500`}
          disabled={loading !== null}
          onClick={() => patchOrg('Set Studio', { plan_id: 'studio' })}
        >
          {loading === 'Set Studio' ? 'Updating...' : 'Set Studio'}
        </button>
      )}

      {/* Divider */}
      <div className="h-5 w-px bg-border-default mx-1" />

      {/* Trial buttons */}
      <button
        className={outlineBtn}
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
        className={outlineBtn}
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
          className={dangerBtn}
          disabled={loading !== null}
          onClick={() =>
            setConfirmAction({
              label: 'End trial',
              body: { trial_ends_at: null },
              message: 'This will end the trial immediately. Are you sure?',
            })
          }
        >
          {loading === 'End trial' ? 'Updating...' : 'End trial'}
        </button>
      )}

      {/* Divider */}
      <div className="h-5 w-px bg-border-default mx-1" />

      {/* Credit grant buttons */}
      <button
        className={outlineBtn}
        disabled={loading !== null || !aiEnabled}
        title={!aiEnabled ? 'AI add-on not enabled for this org' : undefined}
        onClick={() => grantCredits('Grant 100', 100)}
      >
        {loading === 'Grant 100' ? 'Granting...' : 'Grant 100 Credits'}
      </button>
      <button
        className={outlineBtn}
        disabled={loading !== null || !aiEnabled}
        title={!aiEnabled ? 'AI add-on not enabled for this org' : undefined}
        onClick={() => grantCredits('Grant 500', 500)}
      >
        {loading === 'Grant 500' ? 'Granting...' : 'Grant 500 Credits'}
      </button>

      <Dialog open={confirmAction !== null} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Action</DialogTitle>
            <DialogDescription>{confirmAction?.message}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button onClick={() => setConfirmAction(null)} className={outlineBtn}>
              Cancel
            </button>
            <button
              onClick={() => {
                patchOrg(confirmAction!.label, confirmAction!.body)
                setConfirmAction(null)
              }}
              className="rounded-md bg-error px-3 py-1.5 text-xs font-semibold text-white hover:bg-error/90 transition-colors disabled:opacity-50"
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

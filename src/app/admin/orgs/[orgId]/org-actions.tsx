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

const btn = 'rounded-md px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50'
const primary = `${btn} bg-accent text-white hover:bg-accent-hover`
const outline = `${btn} border border-border-default bg-surface-base text-text-primary hover:bg-surface-raised`
const danger = `${btn} border border-error/30 bg-error/5 text-error hover:bg-error/10`

interface OrgActionsProps {
  orgId: string
  currentPlan: string
  trialEndsAt: string | null
}

export function OrgActions({ orgId, currentPlan, trialEndsAt }: OrgActionsProps) {
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
        throw new Error(data?.error || 'Failed to update organization')
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
    setLoading('delete')
    try {
      const res = await fetch(`/api/v1/admin/orgs/${orgId}/delete`, { method: 'POST' })
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

  const busy = loading !== null

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {currentPlan !== 'pro' && (
          <button className={primary} disabled={busy} onClick={() => patchOrg('pro', { plan_id: 'pro' })}>
            {loading === 'pro' ? 'Updating...' : 'Set Pro'}
          </button>
        )}
        {currentPlan !== 'studio' && (
          <button className={primary} disabled={busy} onClick={() => patchOrg('studio', { plan_id: 'studio' })}>
            {loading === 'studio' ? 'Updating...' : 'Set Studio'}
          </button>
        )}
        {currentPlan !== 'free' && (
          <button
            className={danger}
            disabled={busy}
            onClick={() => setConfirmAction({
              label: 'free',
              action: () => patchOrg('free', { plan_id: 'free' }),
              message: 'This will downgrade to the Free plan. Are you sure?',
            })}
          >
            {loading === 'free' ? 'Updating...' : 'Downgrade to Free'}
          </button>
        )}

        <div className="h-4 w-px bg-border-default" />

        <button className={outline} disabled={busy} onClick={() => patchOrg('+7d', { trial_ends_at: new Date(Date.now() + 7 * 86400000).toISOString() })}>
          {loading === '+7d' ? '...' : '+7 day trial'}
        </button>
        <button className={outline} disabled={busy} onClick={() => patchOrg('+30d', { trial_ends_at: new Date(Date.now() + 30 * 86400000).toISOString() })}>
          {loading === '+30d' ? '...' : '+30 day trial'}
        </button>
        {trialEndsAt && (
          <button
            className={danger}
            disabled={busy}
            onClick={() => setConfirmAction({
              label: 'end-trial',
              action: () => patchOrg('end-trial', { trial_ends_at: null }),
              message: 'This will end the trial immediately. Are you sure?',
            })}
          >
            {loading === 'end-trial' ? '...' : 'End trial'}
          </button>
        )}

        <div className="h-4 w-px bg-border-default" />

        <button className={outline} disabled={busy} onClick={() => grantCredits('c100', 100)}>
          {loading === 'c100' ? '...' : '+100 credits'}
        </button>
        <button className={outline} disabled={busy} onClick={() => grantCredits('c500', 500)}>
          {loading === 'c500' ? '...' : '+500 credits'}
        </button>

        <div className="h-4 w-px bg-border-default" />

        <button
          className={danger}
          disabled={busy}
          onClick={() => setConfirmAction({
            label: 'delete',
            action: deleteOrg,
            message: 'This will permanently delete this organization and all its data (clients, shows, episodes, files). This cannot be undone.',
          })}
        >
          {loading === 'delete' ? 'Deleting...' : 'Delete Organization'}
        </button>
      </div>

      <Dialog open={confirmAction !== null} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Action</DialogTitle>
            <DialogDescription>{confirmAction?.message}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button onClick={() => setConfirmAction(null)} className={outline}>Cancel</button>
            <button
              onClick={() => { confirmAction!.action(); setConfirmAction(null) }}
              className={`${btn} bg-error text-white hover:bg-error/90`}
              disabled={busy}
            >
              {loading ? 'Processing...' : 'Confirm'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

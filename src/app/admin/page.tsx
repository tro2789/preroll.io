export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'
import { formatFileSize, formatDate } from '@/lib/format'
import { PLAN_LABELS, PLAN_BADGE_CLASSES } from '@/lib/constants/plans'
import { computeTrialInfo } from '@/lib/entitlements'

export default async function AdminOrganizationsPage() {
  const service = createServiceClient()

  const { data: orgs } = await service
    .from('organizations')
    .select('id, name, slug, plan_id, plan_status, trial_ends_at, stripe_customer_id, storage_used_bytes, storage_addon_tbs, storage_grace_started_at, created_at, updated_at, memberships(count), clients(count)')
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Organizations</h1>
        <span className="text-sm font-medium text-text-secondary">
          {orgs?.length ?? 0} total
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {(orgs ?? []).map((org) => {
          const trial = computeTrialInfo(org.trial_ends_at)
          const members = (org.memberships as unknown as { count: number }[])?.[0]?.count ?? 0
          const clientCount = (org.clients as unknown as { count: number }[])?.[0]?.count ?? 0
          const storage = org.storage_used_bytes ? formatFileSize(org.storage_used_bytes) : '0 B'
          const isActive = org.plan_status === 'active' || !org.plan_status

          return (
            <Link
              key={org.id}
              href={`/admin/orgs/${org.id}`}
              className="rounded-lg border border-border-subtle bg-surface-raised px-5 py-3.5 hover:border-border-default transition-colors flex items-center justify-between gap-4"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-text-primary truncate">
                    {org.name}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${PLAN_BADGE_CLASSES[org.plan_id] ?? PLAN_BADGE_CLASSES.free}`}
                  >
                    {PLAN_LABELS[org.plan_id] ?? org.plan_id}
                  </span>
                  {trial?.active && (
                    <span className="rounded-full bg-warning/15 px-2 py-0.5 text-xs font-medium text-warning">
                      Trial: {trial.daysLeft}d left
                    </span>
                  )}
                  {!isActive && org.plan_status && (
                    <span className="rounded-full bg-error/10 px-2 py-0.5 text-xs font-medium text-error">
                      {org.plan_status}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-text-secondary">{org.slug}</span>
                  {org.stripe_customer_id && (
                    <>
                      <span className="text-xs text-text-tertiary">&middot;</span>
                      <span className="text-xs text-text-secondary">Stripe connected</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-5 shrink-0 text-xs text-text-secondary">
                <div className="text-right">
                  <div className="font-medium">{members}</div>
                  <div className="text-text-tertiary">{members === 1 ? 'member' : 'members'}</div>
                </div>
                <div className="text-right">
                  <div className="font-medium">{clientCount}</div>
                  <div className="text-text-tertiary">{clientCount === 1 ? 'client' : 'clients'}</div>
                </div>
                <div className="text-right">
                  <div className="font-medium">{storage}</div>
                  <div className="text-text-tertiary">storage</div>
                </div>
                <div className="text-right w-20">
                  <div className="font-medium">{formatDate(org.created_at)}</div>
                  <div className="text-text-tertiary">created</div>
                </div>
              </div>
            </Link>
          )
        })}

        {(orgs ?? []).length === 0 && (
          <div className="text-center py-12 text-sm text-text-secondary">
            No organizations found.
          </div>
        )}
      </div>
    </div>
  )
}

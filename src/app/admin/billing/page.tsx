export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'
import { formatFileSize, formatDate } from '@/lib/format'
import { PLAN_LABELS, PLAN_BADGE_CLASSES } from '@/lib/constants/plans'
import { computeTrialInfo } from '@/lib/entitlements'
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table'

export default async function AdminBillingPage() {
  const service = createServiceClient()

  const [orgsRes, aiAddonsRes, creditUsageRes] = await Promise.all([
    service
      .from('organizations')
      .select(
        'id, name, plan_id, plan_status, stripe_customer_id, storage_used_bytes, storage_addon_tbs, trial_ends_at'
      )
      .order('name'),
    service.from('ai_addon').select('org_id, enabled, credits_balance'),
    service
      .from('ai_credit_usage')
      .select('id, org_id, credits_used, balance_after, reason, created_at')
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  const orgs = orgsRes.data ?? []
  const aiAddons = aiAddonsRes.data ?? []
  const creditUsage = creditUsageRes.data ?? []

  // Build lookup maps
  const orgMap = new Map(orgs.map((o) => [o.id, o]))

  // KPI counts
  const paidOrgs = orgs.filter((o) => o.plan_id !== 'free')
  const proCount = orgs.filter((o) => o.plan_id === 'pro').length
  const studioCount = orgs.filter((o) => o.plan_id === 'studio').length

  // Filter to orgs with billing relevance
  const billingOrgs = orgs.filter(
    (o) => o.stripe_customer_id || o.plan_id !== 'free'
  )

  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary mb-6">Billing</h1>

      {/* Section 1: Revenue Overview */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="rounded-lg border border-border-subtle bg-surface-raised p-5">
          <div className="text-3xl font-bold text-text-primary">
            {paidOrgs.length}
          </div>
          <div className="text-xs uppercase tracking-wider text-text-secondary mt-1">
            Paid Orgs
          </div>
        </div>
        <div className="rounded-lg border border-border-subtle bg-surface-raised p-5">
          <div className="text-3xl font-bold text-text-primary">{proCount}</div>
          <div className="text-xs uppercase tracking-wider text-text-secondary mt-1">
            Pro Plans
          </div>
        </div>
        <div className="rounded-lg border border-border-subtle bg-surface-raised p-5">
          <div className="text-3xl font-bold text-text-primary">
            {studioCount}
          </div>
          <div className="text-xs uppercase tracking-wider text-text-secondary mt-1">
            Studio Plans
          </div>
        </div>
      </div>

      {/* Section 2: Subscription Status Table */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-lg font-semibold text-text-primary">
            Subscription Status
          </h2>
          <span className="rounded-full bg-surface-overlay px-2.5 py-0.5 text-xs font-medium text-text-secondary">
            {billingOrgs.length}
          </span>
        </div>

        <div className="rounded-lg border border-border-subtle bg-surface-raised overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organization</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Stripe</TableHead>
                <TableHead>Storage Used</TableHead>
                <TableHead>Add-on TBs</TableHead>
                <TableHead>Trial</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {billingOrgs.map((org) => {
                const trial = computeTrialInfo(org.trial_ends_at)
                const isActive =
                  org.plan_status === 'active' || !org.plan_status

                return (
                  <TableRow key={org.id}>
                    <TableCell>
                      <Link
                        href={`/admin/orgs/${org.id}`}
                        className="text-sm font-medium text-accent hover:text-accent-hover transition-colors"
                      >
                        {org.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${PLAN_BADGE_CLASSES[org.plan_id] ?? PLAN_BADGE_CLASSES.free}`}
                      >
                        {PLAN_LABELS[org.plan_id] ?? org.plan_id}
                      </span>
                    </TableCell>
                    <TableCell>
                      {!isActive && org.plan_status ? (
                        <span className="inline-flex rounded-full bg-error/10 px-2 py-0.5 text-xs font-medium text-error">
                          {org.plan_status}
                        </span>
                      ) : (
                        <span className="text-xs text-text-secondary">
                          Active
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {org.stripe_customer_id ? (
                        <a
                          href={`https://dashboard.stripe.com/customers/${org.stripe_customer_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-accent hover:text-accent-hover transition-colors"
                        >
                          View
                        </a>
                      ) : (
                        <span className="text-xs text-text-tertiary">--</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-text-secondary">
                      {formatFileSize(org.storage_used_bytes ?? 0)}
                    </TableCell>
                    <TableCell className="text-sm text-text-secondary">
                      {org.storage_addon_tbs ?? 0}
                    </TableCell>
                    <TableCell>
                      {trial?.active ? (
                        <span className="inline-flex rounded-full bg-warning/15 px-2 py-0.5 text-xs font-medium text-warning">
                          {trial.daysLeft}d left
                        </span>
                      ) : (
                        <span className="text-xs text-text-tertiary">--</span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}

              {billingOrgs.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-8 text-sm text-text-secondary"
                  >
                    No billing-relevant organizations found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Section 3: Recent AI Credit Activity */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-lg font-semibold text-text-primary">
            Recent AI Credit Activity
          </h2>
          <span className="rounded-full bg-surface-overlay px-2.5 py-0.5 text-xs font-medium text-text-secondary">
            {creditUsage.length}
          </span>
        </div>

        <div className="rounded-lg border border-border-subtle bg-surface-raised overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organization</TableHead>
                <TableHead>Credits Used</TableHead>
                <TableHead>Balance After</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {creditUsage.map((usage) => {
                const org = orgMap.get(usage.org_id)
                return (
                  <TableRow key={usage.id}>
                    <TableCell>
                      {org ? (
                        <Link
                          href={`/admin/orgs/${org.id}`}
                          className="text-sm font-medium text-accent hover:text-accent-hover transition-colors"
                        >
                          {org.name}
                        </Link>
                      ) : (
                        <span className="text-sm text-text-tertiary">
                          Unknown
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-text-primary font-medium">
                      {usage.credits_used}
                    </TableCell>
                    <TableCell className="text-sm text-text-secondary">
                      {usage.balance_after}
                    </TableCell>
                    <TableCell className="text-sm text-text-secondary">
                      {usage.reason}
                    </TableCell>
                    <TableCell className="text-sm text-text-secondary">
                      {formatDate(usage.created_at)}
                    </TableCell>
                  </TableRow>
                )
              })}

              {creditUsage.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-8 text-sm text-text-secondary"
                  >
                    No recent credit activity.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}

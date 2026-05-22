export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'
import { formatFileSize, formatDate } from '@/lib/format'
import { PLAN_LABELS, PLAN_BADGE_CLASSES } from '@/lib/constants/plans'
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table'

export default async function AdminOrgsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; plan?: string }>
}) {
  const { q, plan } = await searchParams
  const service = createServiceClient()

  const [{ data: allOrgs }] = await Promise.all([
    service
      .from('organizations')
      .select(
        'id, name, slug, plan_id, plan_status, trial_ends_at, stripe_customer_id, storage_used_bytes, created_at, memberships(count), clients(count)'
      )
      .order('created_at', { ascending: false }),
  ])

  let orgs = allOrgs ?? []

  if (q) {
    const lower = q.toLowerCase()
    orgs = orgs.filter(
      (o) =>
        o.name?.toLowerCase().includes(lower) ||
        o.slug?.toLowerCase().includes(lower)
    )
  }

  if (plan) {
    orgs = orgs.filter((o) => o.plan_id === plan)
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Organizations</h1>
        <span className="rounded-full bg-surface-overlay px-2.5 py-0.5 text-xs font-medium text-text-secondary">
          {orgs.length}
        </span>
      </div>

      <form method="GET" className="flex gap-2 mb-6">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search orgs..."
          className="rounded-md border border-border-default bg-surface-input px-3 py-1.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        />
        <select
          name="plan"
          defaultValue={plan || ''}
          className="rounded-md border border-border-default bg-surface-input px-3 py-1.5 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        >
          <option value="">All plans</option>
          <option value="free">Free</option>
          <option value="pro">Pro</option>
          <option value="studio">Studio</option>
        </select>
        <button
          type="submit"
          className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-hover transition-colors"
        >
          Search
        </button>
      </form>

      {orgs.length === 0 ? (
        <div className="text-center py-12 text-sm text-text-secondary">
          No organizations found.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Members</TableHead>
              <TableHead className="text-right">Clients</TableHead>
              <TableHead className="text-right">Storage</TableHead>
              <TableHead>Stripe</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orgs.map((org) => {
              const members =
                (org.memberships as unknown as { count: number }[])?.[0]
                  ?.count ?? 0
              const clientCount =
                (org.clients as unknown as { count: number }[])?.[0]?.count ?? 0
              const storage = org.storage_used_bytes
                ? formatFileSize(org.storage_used_bytes)
                : '0 B'
              const isActive =
                org.plan_status === 'active' || !org.plan_status

              return (
                <TableRow key={org.id}>
                  <TableCell>
                    <Link
                      href={`/admin/orgs/${org.id}`}
                      className="hover:underline"
                    >
                      <div className="text-sm font-semibold text-text-primary">
                        {org.name}
                      </div>
                      <div className="text-xs text-text-secondary">
                        {org.slug}
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${PLAN_BADGE_CLASSES[org.plan_id] ?? PLAN_BADGE_CLASSES.free}`}
                    >
                      {PLAN_LABELS[org.plan_id] ?? org.plan_id}
                    </span>
                  </TableCell>
                  <TableCell>
                    {isActive ? (
                      <span className="text-sm text-text-secondary">
                        Active
                      </span>
                    ) : (
                      <span className="rounded-full bg-error/10 px-2 py-0.5 text-xs font-medium text-error">
                        {org.plan_status}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-sm text-text-primary">
                    {members}
                  </TableCell>
                  <TableCell className="text-right text-sm text-text-primary">
                    {clientCount}
                  </TableCell>
                  <TableCell className="text-right text-sm text-text-secondary">
                    {storage}
                  </TableCell>
                  <TableCell>
                    {org.stripe_customer_id ? (
                      <svg
                        className="h-4 w-4 text-success"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    ) : (
                      <span className="text-sm text-text-tertiary">&mdash;</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-text-secondary">
                    {formatDate(org.created_at)}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
    </div>
  )
}

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

export default async function AdminDashboardPage() {
  const service = createServiceClient()

  const [
    { count: orgCount },
    { count: userCount },
    { count: episodeCount },
    { count: showCount },
    { data: planData },
    { data: recentOrgs },
    { data: recentUsers },
    { data: storageData },
    { data: aiData },
  ] = await Promise.all([
    service.from('organizations').select('*', { count: 'exact', head: true }),
    service.from('user_profiles').select('*', { count: 'exact', head: true }),
    service.from('episodes').select('*', { count: 'exact', head: true }),
    service.from('shows').select('*', { count: 'exact', head: true }),
    service.from('organizations').select('plan_id'),
    service
      .from('organizations')
      .select('id, name, slug, plan_id, trial_ends_at, created_at')
      .order('created_at', { ascending: false })
      .limit(10),
    service
      .from('user_profiles')
      .select('user_id, email, display_name, created_at')
      .order('created_at', { ascending: false })
      .limit(10),
    service.from('organizations').select('storage_used_bytes'),
    service.from('ai_addon').select('org_id, credits_balance'),
  ])

  // Compute plan distribution
  const planCounts: Record<string, number> = { free: 0, pro: 0, studio: 0 }
  for (const row of planData ?? []) {
    const plan = row.plan_id ?? 'free'
    planCounts[plan] = (planCounts[plan] ?? 0) + 1
  }
  const totalOrgsForDist = (planData ?? []).length || 1

  // Compute storage totals
  const totalStorageBytes = (storageData ?? []).reduce(
    (sum, row) => sum + (row.storage_used_bytes ?? 0),
    0
  )

  // Compute AI credit totals
  const totalCredits = (aiData ?? []).reduce(
    (sum, row) => sum + (row.credits_balance ?? 0),
    0
  )
  const orgsWithAi = (aiData ?? []).length

  const kpis = [
    { label: 'Total Organizations', value: orgCount ?? 0 },
    { label: 'Total Users', value: userCount ?? 0 },
    { label: 'Total Episodes', value: episodeCount ?? 0 },
    { label: 'Total Shows', value: showCount ?? 0 },
  ]

  const planBarColors: Record<string, string> = {
    free: 'bg-text-secondary',
    pro: 'bg-accent',
    studio: 'bg-purple-400',
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Section 1: KPI Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-lg border border-border-subtle bg-surface-raised p-5"
          >
            <div className="text-3xl font-bold text-text-primary">
              {kpi.value.toLocaleString()}
            </div>
            <div className="mt-1 text-xs font-medium uppercase tracking-wider text-text-secondary">
              {kpi.label}
            </div>
          </div>
        ))}
      </div>

      {/* Section 2: Plan Distribution + Storage Overview */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Plan Distribution */}
        <div className="rounded-lg border border-border-subtle bg-surface-raised p-5">
          <h2 className="text-lg font-semibold text-text-primary">
            Plan Distribution
          </h2>
          <div className="mt-4 flex flex-col gap-3">
            {(['free', 'pro', 'studio'] as const).map((plan) => {
              const count = planCounts[plan]
              const pct = Math.round((count / totalOrgsForDist) * 100)
              return (
                <div key={plan}>
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${PLAN_BADGE_CLASSES[plan]}`}
                    >
                      {PLAN_LABELS[plan]}
                    </span>
                    <span className="text-xs text-text-secondary">
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-surface-overlay">
                    <div
                      className={`h-2 rounded-full ${planBarColors[plan]}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Platform Storage & AI */}
        <div className="rounded-lg border border-border-subtle bg-surface-raised p-5">
          <h2 className="text-lg font-semibold text-text-primary">
            Platform Storage
          </h2>
          <div className="mt-4 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">
                Total storage used
              </span>
              <span className="text-sm font-semibold text-text-primary">
                {formatFileSize(totalStorageBytes)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">
                AI credits remaining
              </span>
              <span className="text-sm font-semibold text-text-primary">
                {totalCredits.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">
                Orgs with AI enabled
              </span>
              <span className="text-sm font-semibold text-text-primary">
                {orgsWithAi}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Recent Signups */}
      <div>
        <h2 className="text-lg font-semibold text-text-primary mb-3">
          Recent Signups
        </h2>
        <div className="rounded-lg border border-border-subtle bg-surface-raised">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(recentOrgs ?? []).map((org) => (
                <TableRow key={org.id}>
                  <TableCell>
                    <Link
                      href={`/admin/orgs/${org.id}`}
                      className="text-sm font-medium text-text-primary hover:text-accent transition-colors"
                    >
                      {org.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-text-secondary">
                    {org.slug}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${PLAN_BADGE_CLASSES[org.plan_id] ?? PLAN_BADGE_CLASSES.free}`}
                    >
                      {PLAN_LABELS[org.plan_id] ?? org.plan_id}
                    </span>
                  </TableCell>
                  <TableCell className="text-text-secondary">
                    {formatDate(org.created_at)}
                  </TableCell>
                </TableRow>
              ))}
              {(recentOrgs ?? []).length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center py-6 text-text-secondary"
                  >
                    No organizations yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Section 4: Recent Users */}
      <div>
        <h2 className="text-lg font-semibold text-text-primary mb-3">
          Recent Users
        </h2>
        <div className="rounded-lg border border-border-subtle bg-surface-raised">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(recentUsers ?? []).map((user) => (
                <TableRow key={user.user_id}>
                  <TableCell>
                    <Link
                      href={`/admin/users/${user.user_id}`}
                      className="text-sm font-medium text-text-primary hover:text-accent transition-colors"
                    >
                      {user.display_name || 'Unnamed'}
                    </Link>
                  </TableCell>
                  <TableCell className="text-text-secondary">
                    {user.email}
                  </TableCell>
                  <TableCell className="text-text-secondary">
                    {formatDate(user.created_at)}
                  </TableCell>
                </TableRow>
              ))}
              {(recentUsers ?? []).length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="text-center py-6 text-text-secondary"
                  >
                    No users yet.
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

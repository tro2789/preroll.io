export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { formatFileSize, formatDate, formatDateTime } from '@/lib/format'
import { PLAN_LABELS, PLAN_BADGE_CLASSES, ROLE_BADGE_CLASSES } from '@/lib/constants/plans'
import { OrgActions } from './org-actions'

export default async function AdminOrgDetailPage({
  params,
}: {
  params: Promise<{ orgId: string }>
}) {
  const { orgId } = await params
  const service = createServiceClient()

  const [orgResult, membersResult, clientsCount, showsCount, episodesCount] =
    await Promise.all([
      service
        .from('organizations')
        .select('id, name, slug, plan_id, plan_status, trial_ends_at, stripe_customer_id, storage_used_bytes, storage_addon_tbs, storage_grace_started_at, created_at, updated_at')
        .eq('id', orgId)
        .single(),
      service
        .from('memberships')
        .select('id, user_id, role, created_at, user_profiles(email, display_name)')
        .eq('org_id', orgId)
        .order('created_at'),
      service
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', orgId),
      service
        .from('shows')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', orgId),
      service
        .from('episodes')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', orgId),
    ])

  if (orgResult.error || !orgResult.data) notFound()
  const org = orgResult.data

  const members = membersResult.data ?? []

  const storageDisplay = org.storage_used_bytes
    ? formatFileSize(org.storage_used_bytes)
    : '0 B'
  const addonDisplay = org.storage_addon_tbs
    ? `${org.storage_addon_tbs} TB`
    : 'None'

  return (
    <div>
      <Link
        href="/admin"
        className="inline-flex items-center gap-1 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors mb-4"
      >
        &larr; Organizations
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">{org.name}</h1>
        <p className="text-sm text-text-secondary mt-0.5">
          {org.slug} &middot;{' '}
          <span className="font-mono text-xs">{org.id}</span>
        </p>
      </div>

      <div className="rounded-lg border border-border-subtle bg-surface-raised divide-y divide-border-subtle mb-6">
        <Row label="Plan">
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${PLAN_BADGE_CLASSES[org.plan_id] ?? PLAN_BADGE_CLASSES.free}`}>
            {PLAN_LABELS[org.plan_id] ?? org.plan_id}
          </span>
        </Row>
        <Row label="Plan Status" value={org.plan_status || '—'} />
        <Row label="Trial Ends" value={formatDateTime(org.trial_ends_at)} />
        <Row label="Stripe Customer ID">
          <span className="text-sm font-mono text-text-primary">
            {org.stripe_customer_id || '—'}
          </span>
        </Row>
        <Row label="Storage Used" value={storageDisplay} />
        <Row label="Storage Add-on" value={addonDisplay} />
        <Row label="Grace Period Started" value={formatDateTime(org.storage_grace_started_at)} />
        <Row label="Created" value={formatDateTime(org.created_at)} />
        <Row label="Updated" value={formatDateTime(org.updated_at)} />
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard label="Clients" value={clientsCount.count ?? 0} />
        <StatCard label="Shows" value={showsCount.count ?? 0} />
        <StatCard label="Episodes" value={episodesCount.count ?? 0} />
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-semibold text-text-primary mb-3">
          Actions
        </h2>
        <OrgActions
          orgId={org.id}
          currentPlan={org.plan_id || 'free'}
          trialEndsAt={org.trial_ends_at}
        />
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-lg font-semibold text-text-primary">Members</h2>
          <span className="rounded-full bg-surface-overlay px-2 py-0.5 text-xs font-medium text-text-secondary">
            {members.length}
          </span>
        </div>

        {members.length > 0 ? (
          <div className="rounded-lg border border-border-subtle bg-surface-raised divide-y divide-border-subtle">
            {members.map((m) => {
              const profile = m.user_profiles as unknown as { email: string; display_name: string | null } | null
              const displayName = profile?.display_name || profile?.email || m.user_id

              return (
                <div
                  key={m.id}
                  className="flex items-center justify-between px-5 py-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-text-primary truncate">
                        {displayName}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_BADGE_CLASSES[m.role] ?? ROLE_BADGE_CLASSES.member}`}
                      >
                        {m.role}
                      </span>
                    </div>
                    {profile?.display_name && profile?.email && (
                      <p className="text-xs text-text-secondary truncate">
                        {profile.email}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-text-secondary shrink-0 ml-4">
                    Joined {formatDate(m.created_at)}
                  </span>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="rounded-lg border border-border-subtle bg-surface-raised px-5 py-8 text-center text-sm text-text-secondary">
            No members found.
          </div>
        )}
      </div>
    </div>
  )
}

function Row({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-5 py-3">
      <span className="text-sm font-medium text-text-secondary">{label}</span>
      {children ?? <span className="text-sm text-text-primary">{value}</span>}
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border-subtle bg-surface-raised px-4 py-3 text-center">
      <div className="text-2xl font-bold text-text-primary">{value}</div>
      <div className="text-xs font-medium text-text-secondary mt-0.5">{label}</div>
    </div>
  )
}

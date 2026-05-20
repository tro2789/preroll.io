export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { formatDate, formatDateTime } from '@/lib/format'
import { PLAN_LABELS, PLAN_BADGE_CLASSES, ROLE_BADGE_CLASSES } from '@/lib/constants/plans'
import { resolveAssetUrl } from '@/lib/r2/resolve'
import { UserActions } from './user-actions'

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>
}) {
  const { userId } = await params
  const service = createServiceClient()

  const [profileResult, membershipsResult, superAdminResult, apiKeysResult] =
    await Promise.all([
      service
        .from('user_profiles')
        .select('user_id, email, display_name, avatar_url, created_at, updated_at')
        .eq('user_id', userId)
        .single(),
      service
        .from('memberships')
        .select('id, org_id, role, created_at, organizations(id, name, plan_id, slug)')
        .eq('user_id', userId),
      service
        .from('super_admins')
        .select('user_id')
        .eq('user_id', userId)
        .single(),
      service
        .from('api_keys')
        .select('id, name, last_used_at, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
    ])

  if (profileResult.error || !profileResult.data) notFound()
  const user = profileResult.data
  const isSuperAdmin = !!superAdminResult.data
  const memberships = membershipsResult.data ?? []
  const apiKeys = apiKeysResult.data ?? []

  const displayName = user.display_name || user.email
  const initial = (displayName ?? '?')[0]?.toUpperCase()
  const avatarSrc = resolveAssetUrl(user.avatar_url)

  return (
    <div>
      <Link
        href="/admin/users"
        className="inline-flex items-center gap-1 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors mb-4"
      >
        &larr; Users
      </Link>

      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        {avatarSrc ? (
          <img
            src={avatarSrc}
            alt=""
            className="h-12 w-12 rounded-full object-cover shrink-0"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-overlay text-sm font-medium text-text-secondary shrink-0">
            {initial}
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-text-primary truncate">
              {displayName}
            </h1>
            {isSuperAdmin && (
              <span className="shrink-0 rounded-full bg-warning/15 px-2.5 py-0.5 text-xs font-medium text-warning">
                super admin
              </span>
            )}
          </div>
          {user.display_name && user.email && (
            <p className="text-sm text-text-secondary truncate">{user.email}</p>
          )}
        </div>
      </div>

      <div className="mb-6">
        <UserActions userId={userId} isSuperAdmin={isSuperAdmin} />
      </div>

      <div className="rounded-lg border border-border-subtle bg-surface-raised divide-y divide-border-subtle mb-6">
        <Row label="User ID">
          <span className="text-sm font-mono text-text-primary">{user.user_id}</span>
        </Row>
        <Row label="Email" value={user.email} />
        <Row label="Display Name" value={user.display_name || '—'} />
        <Row label="Created" value={formatDateTime(user.created_at)} />
        <Row label="Updated" value={formatDateTime(user.updated_at)} />
      </div>

      {/* Organizations */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-lg font-semibold text-text-primary">Organizations</h2>
          <span className="rounded-full bg-surface-overlay px-2 py-0.5 text-xs font-medium text-text-secondary">
            {memberships.length}
          </span>
        </div>

        {memberships.length > 0 ? (
          <div className="space-y-2">
            {memberships.map((m) => {
              const org = m.organizations as unknown as {
                id: string
                name: string
                plan_id: string
                slug: string
              } | null
              if (!org) return null

              return (
                <Link
                  key={m.id}
                  href={`/admin/orgs/${org.id}`}
                  className="flex items-center justify-between rounded-lg border border-border-subtle bg-surface-raised px-5 py-3.5 transition-colors hover:bg-surface-overlay"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-semibold text-text-primary truncate">
                      {org.name}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${PLAN_BADGE_CLASSES[org.plan_id] ?? PLAN_BADGE_CLASSES.free}`}
                    >
                      {PLAN_LABELS[org.plan_id] ?? org.plan_id}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_BADGE_CLASSES[m.role] ?? ROLE_BADGE_CLASSES.member}`}
                    >
                      {m.role}
                    </span>
                  </div>
                  <span className="text-xs text-text-secondary shrink-0 ml-4">
                    Joined {formatDate(m.created_at)}
                  </span>
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="rounded-lg border border-border-subtle bg-surface-raised px-5 py-8 text-center text-sm text-text-secondary">
            No organization memberships.
          </div>
        )}
      </div>

      {/* API Keys */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-lg font-semibold text-text-primary">API Keys</h2>
          <span className="rounded-full bg-surface-overlay px-2 py-0.5 text-xs font-medium text-text-secondary">
            {apiKeys.length}
          </span>
        </div>

        {apiKeys.length > 0 ? (
          <div className="rounded-lg border border-border-subtle bg-surface-raised divide-y divide-border-subtle">
            {apiKeys.map((key) => (
              <div
                key={key.id}
                className="flex items-center justify-between px-5 py-3"
              >
                <div className="min-w-0">
                  <span className="text-sm font-semibold text-text-primary truncate">
                    {key.name}
                  </span>
                </div>
                <div className="flex items-center gap-4 shrink-0 ml-4">
                  <span className="text-xs text-text-secondary">
                    {key.last_used_at
                      ? `Last used ${formatDate(key.last_used_at)}`
                      : 'Never used'}
                  </span>
                  <span className="text-xs text-text-secondary">
                    Created {formatDate(key.created_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-border-subtle bg-surface-raised px-5 py-8 text-center text-sm text-text-secondary">
            No API keys.
          </div>
        )}
      </div>
    </div>
  )
}

function Row({
  label,
  value,
  children,
}: {
  label: string
  value?: string
  children?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between px-5 py-3">
      <span className="text-sm font-medium text-text-secondary">{label}</span>
      {children ?? <span className="text-sm text-text-primary">{value}</span>}
    </div>
  )
}

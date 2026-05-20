import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/format'
import { PLAN_BADGE_CLASSES } from '@/lib/constants/plans'

export const dynamic = 'force-dynamic'

export default async function AdminUsersPage() {
  const service = createServiceClient()

  const [profilesRes, membershipsRes, superAdminsRes] = await Promise.all([
    service
      .from('user_profiles')
      .select('user_id, email, display_name, avatar_url, created_at')
      .order('created_at', { ascending: false }),
    service
      .from('memberships')
      .select('user_id, role, organizations(id, name, plan_id)'),
    service
      .from('super_admins')
      .select('user_id'),
  ])

  const profiles = profilesRes.data ?? []
  const memberships = membershipsRes.data ?? []
  const superAdminIds = new Set(
    (superAdminsRes.data ?? []).map((sa: { user_id: string }) => sa.user_id)
  )

  const orgsByUser = new Map<
    string,
    { orgId: string; orgName: string; planId: string; role: string }[]
  >()

  for (const m of memberships) {
    const org = m.organizations as unknown as { id: string; name: string; plan_id: string } | null
    if (!org) continue

    const existing = orgsByUser.get(m.user_id) ?? []
    existing.push({
      orgId: org.id,
      orgName: org.name,
      planId: org.plan_id,
      role: m.role,
    })
    orgsByUser.set(m.user_id, existing)
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <h1 className="text-2xl font-bold text-text-primary">Users</h1>
        <span className="rounded-full bg-surface-overlay px-2.5 py-0.5 text-xs font-medium text-text-secondary">
          {profiles.length}
        </span>
      </div>

      <div className="space-y-2">
        {profiles.map((user) => {
          const userOrgs = orgsByUser.get(user.user_id) ?? []
          const isSuperAdmin = superAdminIds.has(user.user_id)
          const displayName = user.display_name || user.email

          return (
            <div
              key={user.user_id}
              className="flex items-center justify-between rounded-lg border border-border-subtle bg-surface-raised px-5 py-3.5"
            >
              <div className="flex items-center gap-3 min-w-0">
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt=""
                    className="h-8 w-8 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-overlay text-xs font-medium text-text-secondary shrink-0">
                    {(displayName ?? '?')[0]?.toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-text-primary truncate">
                      {displayName}
                    </span>
                    {isSuperAdmin && (
                      <span className="shrink-0 rounded-full bg-warning/15 px-2 py-0.5 text-xs font-medium text-warning">
                        super admin
                      </span>
                    )}
                  </div>
                  {user.display_name && user.email && (
                    <p className="text-xs text-text-secondary truncate">{user.email}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 shrink-0 ml-4">
                {userOrgs.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-1.5 justify-end">
                    {userOrgs.map((org) => (
                      <Link
                        key={org.orgId}
                        href={`/admin/orgs/${org.orgId}`}
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-opacity hover:opacity-80 ${PLAN_BADGE_CLASSES[org.planId] ?? PLAN_BADGE_CLASSES.free}`}
                      >
                        {org.orgName}
                        <span className="opacity-60">({org.role})</span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-text-tertiary">No org</span>
                )}

                <span className="text-xs text-text-secondary whitespace-nowrap">
                  {formatDate(user.created_at)}
                </span>
              </div>
            </div>
          )
        })}

        {profiles.length === 0 && (
          <p className="py-12 text-center text-sm text-text-secondary">No users found.</p>
        )}
      </div>
    </div>
  )
}

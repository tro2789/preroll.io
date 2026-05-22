import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/format'
import { PLAN_BADGE_CLASSES } from '@/lib/constants/plans'
import { resolveAssetUrl } from '@/lib/r2/resolve'
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table'

export const dynamic = 'force-dynamic'

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
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

  let profiles = profilesRes.data ?? []
  const memberships = membershipsRes.data ?? []
  const superAdminIds = new Set(
    (superAdminsRes.data ?? []).map((sa: { user_id: string }) => sa.user_id)
  )

  if (q) {
    const lower = q.toLowerCase()
    profiles = profiles.filter(
      (u) =>
        u.display_name?.toLowerCase().includes(lower) ||
        u.email?.toLowerCase().includes(lower)
    )
  }

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

      <form method="GET" className="flex gap-2 mb-6">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search users..."
          className="flex-1 rounded-md border border-border-default bg-surface-input px-3 py-1.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        />
        <button
          type="submit"
          className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-hover transition-colors"
        >
          Search
        </button>
      </form>

      {profiles.length === 0 ? (
        <p className="py-12 text-center text-sm text-text-secondary">No users found.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Organizations</TableHead>
              <TableHead>Super Admin</TableHead>
              <TableHead>Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {profiles.map((user) => {
              const userOrgs = orgsByUser.get(user.user_id) ?? []
              const isSuperAdmin = superAdminIds.has(user.user_id)
              const displayName = user.display_name || user.email
              const avatarSrc = resolveAssetUrl(user.avatar_url)

              return (
                <TableRow key={user.user_id}>
                  <TableCell>
                    <Link
                      href={`/admin/users/${user.user_id}`}
                      className="flex items-center gap-3 min-w-0 hover:opacity-80 transition-opacity"
                    >
                      {avatarSrc ? (
                        <img
                          src={avatarSrc}
                          alt=""
                          className="h-8 w-8 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-overlay text-xs font-medium text-text-secondary shrink-0">
                          {(displayName ?? '?')[0]?.toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-text-primary truncate">
                          {displayName}
                        </div>
                        {user.display_name && user.email && (
                          <div className="text-xs text-text-secondary truncate">
                            {user.email}
                          </div>
                        )}
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell>
                    {userOrgs.length > 0 ? (
                      <div className="flex flex-wrap items-center gap-1.5">
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
                  </TableCell>
                  <TableCell>
                    {isSuperAdmin && (
                      <span className="rounded-full bg-warning/15 px-2 py-0.5 text-xs font-medium text-warning">
                        super admin
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-text-secondary whitespace-nowrap">
                    {formatDate(user.created_at)}
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

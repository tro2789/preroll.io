export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/format'
import { resolveAssetUrl } from '@/lib/r2/resolve'
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table'

export default async function AdminSecurityPage() {
  const service = createServiceClient()

  const [superAdminsRes, apiKeysRes, profilesRes, orgsRes] = await Promise.all([
    service
      .from('super_admins')
      .select('user_id, created_at')
      .order('created_at'),
    service
      .from('api_keys')
      .select('id, user_id, name, last_used_at, created_at, org_id')
      .order('created_at', { ascending: false })
      .limit(50),
    service
      .from('user_profiles')
      .select('user_id, email, display_name, avatar_url'),
    service.from('organizations').select('id, name'),
  ])

  const superAdmins = superAdminsRes.data ?? []
  const apiKeys = apiKeysRes.data ?? []
  const profiles = profilesRes.data ?? []
  const orgs = orgsRes.data ?? []

  // Build lookup maps
  const profileMap = new Map(profiles.map((p) => [p.user_id, p]))
  const orgMap = new Map(orgs.map((o) => [o.id, o]))

  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary mb-6">Security</h1>

      {/* Section 1: Super Admins */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-lg font-semibold text-text-primary">
            Super Admins
          </h2>
          <span className="rounded-full bg-surface-overlay px-2.5 py-0.5 text-xs font-medium text-text-secondary">
            {superAdmins.length}
          </span>
        </div>

        <div className="flex flex-col gap-2">
          {superAdmins.map((sa) => {
            const profile = profileMap.get(sa.user_id)
            const displayName = profile?.display_name || profile?.email || 'Unknown'
            const initial = (displayName ?? '?')[0]?.toUpperCase()

            return (
              <div
                key={sa.user_id}
                className="flex items-center gap-3 rounded-lg border border-border-subtle bg-surface-raised px-5 py-3.5"
              >
                {resolveAssetUrl(profile?.avatar_url) ? (
                  <img
                    src={resolveAssetUrl(profile?.avatar_url)!}
                    alt=""
                    className="h-9 w-9 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-warning/15 text-sm font-medium text-warning shrink-0">
                    {initial}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-text-primary truncate">
                      {displayName}
                    </span>
                    <span className="shrink-0 rounded-full bg-warning/15 px-2 py-0.5 text-xs font-medium text-warning">
                      super admin
                    </span>
                  </div>
                  {profile?.display_name && profile?.email && (
                    <p className="text-xs text-text-secondary truncate">
                      {profile.email}
                    </p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-xs text-text-secondary">
                    Granted {formatDate(sa.created_at)}
                  </div>
                </div>
              </div>
            )
          })}

          {superAdmins.length === 0 && (
            <div className="text-center py-8 text-sm text-text-secondary">
              No super admins configured.
            </div>
          )}
        </div>
      </div>

      {/* Section 2: Platform API Keys */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-lg font-semibold text-text-primary">API Keys</h2>
          <span className="rounded-full bg-surface-overlay px-2.5 py-0.5 text-xs font-medium text-text-secondary">
            {apiKeys.length}
          </span>
        </div>

        <div className="rounded-lg border border-border-subtle bg-surface-raised overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Key Name</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Last Used</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apiKeys.map((key) => {
                const owner = profileMap.get(key.user_id)
                const org = orgMap.get(key.org_id)

                return (
                  <TableRow key={key.id}>
                    <TableCell className="text-sm font-medium text-text-primary">
                      {key.name}
                    </TableCell>
                    <TableCell className="text-sm text-text-secondary">
                      {owner?.email ?? 'Unknown'}
                    </TableCell>
                    <TableCell>
                      {org ? (
                        <Link
                          href={`/admin/orgs/${org.id}`}
                          className="text-sm text-accent hover:text-accent-hover transition-colors"
                        >
                          {org.name}
                        </Link>
                      ) : (
                        <span className="text-sm text-text-tertiary">
                          Unknown
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-text-secondary">
                      {key.last_used_at ? formatDate(key.last_used_at) : (
                        <span className="text-text-tertiary">Never</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-text-secondary">
                      {formatDate(key.created_at)}
                    </TableCell>
                  </TableRow>
                )
              })}

              {apiKeys.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-8 text-sm text-text-secondary"
                  >
                    No API keys found.
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

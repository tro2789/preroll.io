import { errorResponse } from '@/lib/api/helpers'
import type { OrgContext } from './resolve'

const ROLE_LEVELS: Record<string, number> = { member: 0, admin: 1, owner: 2 }

export function requireRole(org: OrgContext, minRole: 'admin' | 'owner') {
  const userLevel = ROLE_LEVELS[org.role] ?? 0
  const requiredLevel = ROLE_LEVELS[minRole]
  if (userLevel < requiredLevel) {
    return errorResponse(`This action requires ${minRole} role or higher.`, 403)
  }
  return null
}

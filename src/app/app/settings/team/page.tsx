'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { UpgradeGate } from '@/components/ui/upgrade-gate'

interface Member {
  id: string
  user_id: string
  email: string | null
  name: string | null
  avatar_url: string | null
  role: string
  created_at: string
}

import { resolveAssetUrl } from '@/lib/r2/resolve'

interface Invite {
  id: string
  email: string
  role: string
  expires_at: string
  created_at: string
}

const ROLE_COLORS: Record<string, string> = {
  owner: 'bg-purple-500/15 text-purple-400',
  admin: 'bg-blue-500/15 text-blue-400',
  member: 'bg-surface-overlay text-text-secondary',
}

export default function TeamPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [invites, setInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('member')
  const [inviting, setInviting] = useState(false)
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null)
  const [inviteError, setInviteError] = useState<string | null>(null)

  const [canInvite, setCanInvite] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null)
  const [cancelingId, setCancelingId] = useState<string | null>(null)

  async function refreshTeam() {
    const res = await fetch('/api/v1/team')
    const json = await res.json()
    if (json.data) {
      setMembers(json.data.members || [])
      setInvites(json.data.invites || [])
      if (json.data.canInvite !== undefined) setCanInvite(json.data.canInvite)
      return json.data.members as Member[]
    }
    return []
  }

  useEffect(() => {
    async function init() {
      try {
        const supabase = createClient()
        const [, { data: { user } }] = await Promise.all([
          refreshTeam().then((m) => {
            setLoading(false)
            return m
          }),
          supabase.auth.getUser(),
        ])
        if (user) {
          setCurrentUserId(user.id)
        }
      } catch {
        setLoading(false)
      }
    }
    init()
  }, [])

  const currentUserRole = useMemo(() => {
    if (!currentUserId) return 'member'
    return members.find((m) => m.user_id === currentUserId)?.role ?? 'member'
  }, [currentUserId, members])

  const isAdmin = currentUserRole === 'admin' || currentUserRole === 'owner'

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!inviteEmail.trim()) return
    setInviting(true)
    setInviteError(null)
    setInviteSuccess(null)
    try {
      const res = await fetch('/api/v1/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Failed to send invite')
      }
      setInviteSuccess(`Invite sent to ${inviteEmail.trim()}`)
      setInviteEmail('')
      setInviteRole('member')
      await refreshTeam()
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setInviting(false)
    }
  }

  async function handleRemove(memberId: string) {
    setRemovingId(memberId)
    try {
      await fetch(`/api/v1/team/${memberId}`, { method: 'DELETE' })
      await refreshTeam()
    } catch {}
    setRemovingId(null)
    setConfirmRemoveId(null)
  }

  async function handleCancelInvite(inviteId: string) {
    setCancelingId(inviteId)
    try {
      await fetch(`/api/v1/team/invite/${inviteId}`, { method: 'DELETE' })
      await refreshTeam()
    } catch {}
    setCancelingId(null)
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  if (loading) {
    return <div className="text-sm text-text-tertiary">Loading team...</div>
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
          Team Members
        </h2>
        <p className="mt-1 text-xs text-text-tertiary">
          Manage who has access to your organization.
        </p>

        {members.length === 0 ? (
          <div className="mt-4 rounded-lg border border-border-subtle bg-surface-raised p-8 text-center">
            <p className="text-sm text-text-secondary">No team members found.</p>
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {members.map((m) => {
              const avatarSrc = resolveAssetUrl(m.avatar_url)
              return (
              <div key={m.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border border-border-subtle bg-surface-raised px-4 sm:px-5 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  {avatarSrc ? (
                    <img
                      src={avatarSrc}
                      alt={m.name || ''}
                      className="h-8 w-8 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent text-xs font-bold">
                      {(m.name || m.email || '?').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {m.name || m.email || 'Unknown'}
                      {m.user_id === currentUserId && (
                        <span className="ml-1.5 text-xs text-text-tertiary">(you)</span>
                      )}
                    </p>
                    {m.name && m.email && (
                      <p className="text-xs text-text-tertiary truncate">{m.email}</p>
                    )}
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_COLORS[m.role] || ROLE_COLORS.member}`}>
                    {m.role}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-text-tertiary">
                    Joined {formatDate(m.created_at)}
                  </span>
                  {isAdmin && m.role !== 'owner' && m.user_id !== currentUserId && (
                    <>
                      {confirmRemoveId === m.id ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleRemove(m.id)}
                            disabled={removingId === m.id}
                            className="rounded-md bg-red-600 px-2 py-0.5 text-xs font-medium text-white hover:bg-red-500 transition-colors disabled:opacity-50"
                          >
                            {removingId === m.id ? '...' : 'Confirm'}
                          </button>
                          <button
                            onClick={() => setConfirmRemoveId(null)}
                            className="text-xs text-text-tertiary hover:text-text-secondary"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmRemoveId(m.id)}
                          className="text-xs text-text-tertiary hover:text-red-400 transition-colors"
                        >
                          Remove
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            )})}
          </div>
        )}
      </div>

      {isAdmin && !canInvite && (
        <UpgradeGate
          feature="Multi-User Teams"
          description="Invite team members with role-based access to collaborate on client shows and episodes. Available on the Studio plan."
          tier="Studio"
          icon={
            <svg className="h-6 w-6 text-accent" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
            </svg>
          }
        />
      )}

      {isAdmin && canInvite && (
        <div>
          <h2 className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
            Invite Team Member
          </h2>
          <p className="mt-1 text-xs text-text-tertiary">
            Send an email invitation to add someone to your organization.
          </p>

          {inviteSuccess && (
            <div className="mt-4 rounded-lg border border-success/30 bg-success/5 px-4 py-3 text-sm text-success">
              {inviteSuccess}
            </div>
          )}

          {inviteError && (
            <div className="mt-4 rounded-lg border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-warning">
              {inviteError}
            </div>
          )}

          <form onSubmit={handleInvite} className="mt-4 flex flex-col sm:flex-row gap-2">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="teammate@example.com"
              required
              className="flex-1 sm:max-w-xs rounded-md border border-border-default bg-surface-input px-3 py-1.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
            <div className="flex gap-2">
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="rounded-md border border-border-default bg-surface-input px-3 py-1.5 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
              <button
                type="submit"
                disabled={!inviteEmail.trim() || inviting}
                className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
              >
                {inviting ? 'Sending...' : 'Send Invite'}
              </button>
            </div>
          </form>
        </div>
      )}

      {invites.length > 0 && (
        <div>
          <h2 className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
            Pending Invites
          </h2>
          <div className="mt-4 space-y-2">
            {invites.map((inv) => (
              <div key={inv.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border border-border-subtle bg-surface-raised px-4 sm:px-5 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{inv.email}</p>
                    <p className="text-xs text-text-tertiary">
                      Expires {formatDate(inv.expires_at)}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_COLORS[inv.role] || ROLE_COLORS.member}`}>
                    {inv.role}
                  </span>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => handleCancelInvite(inv.id)}
                    disabled={cancelingId === inv.id}
                    className="text-xs text-text-tertiary hover:text-red-400 transition-colors disabled:opacity-50"
                  >
                    {cancelingId === inv.id ? 'Canceling...' : 'Cancel'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

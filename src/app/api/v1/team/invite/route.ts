import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'
import { createServiceClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/org/roles'
import { getOrgEntitlements } from '@/lib/entitlements'
import { getSiteUrl, generateMagicLinkUrl, sendEmail } from '@/lib/email/send'

export async function POST(request: Request) {
  const { user, org, error } = await getAuthenticatedClient()
  if (error) return error

  const roleError = requireRole(org!, 'admin')
  if (roleError) return roleError

  const entitlements = await getOrgEntitlements(org!.id, org!.planId, org!.trialEndsAt)
  if (!entitlements.can('multi_user')) {
    return errorResponse('Upgrade to Studio to invite team members.', 403)
  }

  const body = await request.json()
  const email = body.email?.trim()?.toLowerCase()
  if (!email) return errorResponse('email is required')

  const role = body.role || 'member'
  if (!['member', 'admin'].includes(role)) {
    return errorResponse('role must be "member" or "admin"')
  }

  const service = createServiceClient()

  const [{ data: orgMembers }, { data: pendingInvite }] = await Promise.all([
    service
      .from('memberships')
      .select('user_id')
      .eq('org_id', org!.id),
    service
      .from('team_invites')
      .select('id')
      .eq('org_id', org!.id)
      .eq('email', email)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle(),
  ])

  if (pendingInvite) {
    return errorResponse('An invite is already pending for this email.', 409)
  }

  if (orgMembers && orgMembers.length > 0) {
    const userChecks = await Promise.all(
      orgMembers.map((m) => service.auth.admin.getUserById(m.user_id))
    )
    if (userChecks.some((r) => r.data.user?.email === email)) {
      return errorResponse('This user is already a member of your organization.', 409)
    }
  }

  const token = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data: invite, error: insertError } = await service
    .from('team_invites')
    .insert({
      org_id: org!.id,
      email,
      role,
      invited_by: user!.id,
      token,
      expires_at: expiresAt,
    })
    .select('id, email, role, invited_by, expires_at, created_at')
    .single()

  if (insertError) return errorResponse(insertError.message, 500)

  const [siteUrl, { data: orgData }] = await Promise.all([
    getSiteUrl(),
    service.from('organizations').select('name').eq('id', org!.id).single(),
  ])

  const joinPath = `/team/join?token=${token}`
  const fallbackUrl = `${siteUrl}${joinPath}`
  const loginUrl = await generateMagicLinkUrl(email, siteUrl, joinPath, fallbackUrl)

  const inviterName = user!.user_metadata?.full_name || user!.email?.split('@')[0] || 'A team member'
  const orgName = orgData?.name || 'their organization'

  const emailSent = await sendEmail(
    email,
    `${inviterName} invited you to join ${orgName} on PreRoll`,
    `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="font-size: 18px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 24px;">PREROLL</h1>
        <p style="font-size: 15px; color: #333; line-height: 1.6;">
          Hi there,
        </p>
        <p style="font-size: 15px; color: #333; line-height: 1.6;">
          ${inviterName} has invited you to join <strong>${orgName}</strong> on PreRoll as a ${role}. You'll be able to collaborate on podcast production, manage episodes, and more.
        </p>
        <a href="${loginUrl}" style="display: inline-block; margin: 24px 0; padding: 12px 24px; background-color: #7c3aed; color: #fff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600;">
          Join Team
        </a>
        <p style="font-size: 13px; color: #888; line-height: 1.5; margin-top: 24px;">
          This link expires in 7 days. If it's expired, ask ${inviterName} to send a new invite.
        </p>
      </div>
    `,
  )

  return jsonResponse({ ...invite, email_sent: emailSent }, 201)
}

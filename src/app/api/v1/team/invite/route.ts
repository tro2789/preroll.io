import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'
import { createServiceClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/org/roles'
import { getOrgEntitlements } from '@/lib/entitlements'
import { getSiteUrl, generateMagicLinkUrl, sendEmail } from '@/lib/email/send'
import { emailTemplate } from '@/lib/email/template'

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
    `${inviterName} invited you to join ${orgName} on preroll.io`,
    emailTemplate({
      greeting: 'Hi there,',
      body: `<p style="margin: 0;">${inviterName} has invited you to join <strong>${orgName}</strong> on preroll.io as a ${role}. You'll be able to collaborate on podcast production, manage episodes, and more.</p>`,
      cta: { label: 'Join Team', url: loginUrl },
      footer: `This link expires in 7 days. If it's expired, ask ${inviterName} to send a new invite.`,
    }),
  )

  return jsonResponse({ ...invite, email_sent: emailSent }, 201)
}

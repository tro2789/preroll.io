import { jsonResponse, errorResponse } from '@/lib/api/helpers'
import { createServiceClient } from '@/lib/supabase/server'
import { getSiteUrl, generateMagicLinkUrl, sendEmail } from '@/lib/email/send'
import { emailTemplate } from '@/lib/email/template'

export async function POST(request: Request) {
  const body = await request.json()
  const token = body.token?.trim()
  if (!token) return errorResponse('token is required')

  const service = createServiceClient()

  const { data: invite, error: fetchError } = await service
    .from('team_invites')
    .select('id, org_id, email, accepted_at, expires_at, organizations(name)')
    .eq('token', token)
    .single()

  if (fetchError || !invite) return errorResponse('Invalid invite token', 404)
  if (invite.accepted_at) return errorResponse('This invite has already been accepted', 400)
  if (new Date(invite.expires_at) < new Date()) return errorResponse('This invite has expired', 400)

  const siteUrl = await getSiteUrl()
  const joinPath = `/team/join?token=${token}`
  const fallbackUrl = `${siteUrl}${joinPath}`
  const loginUrl = await generateMagicLinkUrl(invite.email, siteUrl, joinPath, fallbackUrl)

  const org = invite.organizations as unknown as { name: string } | null
  const orgName = org?.name || 'a team'

  await sendEmail(
    invite.email,
    `Sign in to join ${orgName} on preroll.io`,
    emailTemplate({
      body: `<p style="margin: 0;">Click the button below to sign in and join <strong>${orgName}</strong>.</p>`,
      cta: { label: 'Sign In & Join Team', url: loginUrl },
    }),
  )

  return jsonResponse({ sent: true })
}

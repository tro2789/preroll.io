import { jsonResponse, errorResponse } from '@/lib/api/helpers'
import { createServiceClient } from '@/lib/supabase/server'
import { getSiteUrl, generateMagicLinkUrl, sendEmail } from '@/lib/email/send'

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
    `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="font-size: 18px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 24px;">PREROLL.IO</h1>
        <p style="font-size: 15px; color: #333; line-height: 1.6;">
          Click the link below to sign in and join <strong>${orgName}</strong>.
        </p>
        <a href="${loginUrl}" style="display: inline-block; margin: 24px 0; padding: 12px 24px; background-color: #7c3aed; color: #fff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600;">
          Sign In & Join Team
        </a>
      </div>
    `,
  )

  return jsonResponse({ sent: true })
}

import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'
import { getSiteUrl, generateMagicLinkUrl, sendEmail } from '@/lib/email/send'

export async function POST(request: Request) {
  const { supabase, user, org, error } = await getAuthenticatedClient()
  if (error) return error

  const body = await request.json()
  if (!body.client_id) return errorResponse('client_id is required')

  const [{ data: client, error: fetchError }, { data: shows }] = await Promise.all([
    supabase!
      .from('clients')
      .select('id, name, email, org_id')
      .eq('id', body.client_id)
      .single(),
    supabase!
      .from('shows')
      .select('name')
      .eq('client_id', body.client_id)
      .limit(5),
  ])

  if (fetchError || !client) return errorResponse('Client not found', 404)
  if (client.org_id !== org!.id) return errorResponse('Forbidden', 403)
  if (!client.email) return errorResponse('Client has no email address', 400)

  const producerName = user!.user_metadata?.full_name || user!.email?.split('@')[0] || 'Your producer'
  const showNames = (shows ?? []).map((s) => s.name)

  const invite_code = crypto.randomUUID()

  const { data, error: updateError } = await supabase!
    .from('clients')
    .update({ invite_code, invite_sent_at: new Date().toISOString() })
    .eq('id', body.client_id)
    .select()
    .single()

  if (updateError) return errorResponse(updateError.message, 500)

  const siteUrl = await getSiteUrl()
  const onboardingPath = `/onboarding?invite=${invite_code}`
  const fallbackUrl = `${siteUrl}/invite/${invite_code}`

  const loginUrl = await generateMagicLinkUrl(client.email, siteUrl, onboardingPath, fallbackUrl)

  const emailSent = await sendEmail(
    client.email,
    `${producerName} has invited you to PreRoll`,
    `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="font-size: 18px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 24px;">PREROLL</h1>
        <p style="font-size: 15px; color: #333; line-height: 1.6;">
          Hi ${client.name?.split(' ')[0] || 'there'},
        </p>
        <p style="font-size: 15px; color: #333; line-height: 1.6;">
          ${producerName} has set up a client portal for you on PreRoll${showNames.length > 0 ? ` for <strong>${showNames.join('</strong>, <strong>')}</strong>` : ''}. You'll be able to track episode progress, review deliverables, and leave feedback — all in one place.
        </p>
        <a href="${loginUrl}" style="display: inline-block; margin: 24px 0; padding: 12px 24px; background-color: #7c3aed; color: #fff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600;">
          Open Your Portal
        </a>
        <p style="font-size: 13px; color: #888; line-height: 1.5; margin-top: 24px;">
          This link expires in 24 hours. If it's expired, <a href="${fallbackUrl}" style="color: #7c3aed;">click here</a> to request a new one.
        </p>
      </div>
    `,
  )

  return jsonResponse({ invite_code, client: data, email_sent: emailSent }, 201)
}

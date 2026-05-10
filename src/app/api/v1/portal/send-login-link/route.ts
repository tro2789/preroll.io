import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'
import { getSiteUrl, generateMagicLinkUrl, sendEmail } from '@/lib/email/send'

export async function POST(request: Request) {
  const { supabase, user, org, error } = await getAuthenticatedClient()
  if (error) return error

  const body = await request.json()
  if (!body.client_id) return errorResponse('client_id is required')

  const { data: client, error: fetchError } = await supabase!
    .from('clients')
    .select('id, name, email, org_id')
    .eq('id', body.client_id)
    .single()

  if (fetchError || !client) return errorResponse('Client not found', 404)
  if (client.org_id !== org!.id) return errorResponse('Forbidden', 403)
  if (!client.email) return errorResponse('Client has no email address', 400)

  const siteUrl = await getSiteUrl()
  const producerName = user!.user_metadata?.full_name || user!.email?.split('@')[0] || 'Your producer'

  const loginUrl = await generateMagicLinkUrl(client.email, siteUrl, '/portal', `${siteUrl}/login`)

  const emailSent = await sendEmail(
    client.email,
    `Your preroll.io login link`,
    `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="font-size: 18px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 24px;">PREROLL.IO</h1>
        <p style="font-size: 15px; color: #333; line-height: 1.6;">
          Hi ${client.name?.split(' ')[0] || 'there'},
        </p>
        <p style="font-size: 15px; color: #333; line-height: 1.6;">
          ${producerName} sent you a link to access your client portal.
        </p>
        <a href="${loginUrl}" style="display: inline-block; margin: 24px 0; padding: 12px 24px; background-color: #7c3aed; color: #fff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600;">
          Open Your Portal
        </a>
        <p style="font-size: 13px; color: #888; line-height: 1.5; margin-top: 24px;">
          This link expires in 24 hours.
        </p>
      </div>
    `,
  )

  if (!emailSent) return errorResponse('Failed to send email', 500)
  return jsonResponse({ sent: true })
}

import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'
import { getSiteUrl, sendEmail } from '@/lib/email/send'

export async function POST(request: Request) {
  const { supabase, user, org, error } = await getAuthenticatedClient()
  if (error) return error

  const body = await request.json()
  if (!body.client_id) return errorResponse('client_id is required')

  const { data: client, error: fetchError } = await supabase!
    .from('clients')
    .select('id, name, email, org_id, invite_code')
    .eq('id', body.client_id)
    .single()

  if (fetchError || !client) return errorResponse('Client not found', 404)
  if (client.org_id !== org!.id) return errorResponse('Forbidden', 403)

  const invite_code = client.invite_code || crypto.randomUUID()

  if (body.generate_only) {
    if (client.invite_code) return jsonResponse({ invite_code })
    const { error: updateError } = await supabase!
      .from('clients')
      .update({ invite_code })
      .eq('id', body.client_id)
    if (updateError) return errorResponse(updateError.message, 500)
    return jsonResponse({ invite_code }, 201)
  }

  if (!client.email) return errorResponse('Client has no email address', 400)

  const [{ data: shows }, producerName] = await Promise.all([
    supabase!
      .from('shows')
      .select('name')
      .eq('client_id', body.client_id)
      .limit(5),
    Promise.resolve(user!.user_metadata?.full_name || user!.email?.split('@')[0] || 'Your producer'),
  ])

  const showNames = (shows ?? []).map((s) => s.name)

  const { data, error: updateError } = await supabase!
    .from('clients')
    .update({ invite_code, invite_sent_at: new Date().toISOString() })
    .eq('id', body.client_id)
    .select()
    .single()

  if (updateError) return errorResponse(updateError.message, 500)

  const siteUrl = await getSiteUrl()
  const shareUrl = `${siteUrl}/share/${invite_code}`

  const emailSent = await sendEmail(
    client.email,
    `${producerName} has invited you to preroll.io`,
    `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="font-size: 18px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 24px;">PREROLL.IO</h1>
        <p style="font-size: 15px; color: #333; line-height: 1.6;">
          Hi ${client.name?.split(' ')[0] || 'there'},
        </p>
        <p style="font-size: 15px; color: #333; line-height: 1.6;">
          ${producerName} has set up a client portal for you on preroll.io${showNames.length > 0 ? ` for <strong>${showNames.join('</strong>, <strong>')}</strong>` : ''}. You'll be able to track episode progress, review deliverables, and leave feedback — all in one place.
        </p>
        <a href="${shareUrl}" style="display: inline-block; margin: 24px 0; padding: 12px 24px; background-color: #7c3aed; color: #fff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600;">
          Open Your Portal
        </a>
        <p style="font-size: 13px; color: #888; line-height: 1.5; margin-top: 24px;">
          Bookmark this link to come back anytime.
        </p>
      </div>
    `,
  )

  return jsonResponse({ invite_code, client: data, email_sent: emailSent }, 201)
}

import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'
import { headers } from 'next/headers'

export async function POST(request: Request) {
  const { supabase, user, error } = await getAuthenticatedClient()
  if (error) return error

  const body = await request.json()
  if (!body.client_id) return errorResponse('client_id is required')

  const { data: client, error: fetchError } = await supabase!
    .from('clients')
    .select('id, name, email, user_id')
    .eq('id', body.client_id)
    .single()

  if (fetchError || !client) return errorResponse('Client not found', 404)
  if (client.user_id !== user!.id) return errorResponse('Forbidden', 403)
  if (!client.email) return errorResponse('Client has no email address', 400)

  const invite_code = crypto.randomUUID()

  const { data, error: updateError } = await supabase!
    .from('clients')
    .update({ invite_code, invite_sent_at: new Date().toISOString() })
    .eq('id', body.client_id)
    .select()
    .single()

  if (updateError) return errorResponse(updateError.message, 500)

  const headersList = await headers()
  const host = headersList.get('host') || 'dev.preroll.io'
  const protocol = host.includes('localhost') || host.includes('192.168') ? 'http' : 'https'
  const inviteUrl = `${protocol}://${host}/invite/${invite_code}`

  const resendKey = process.env.RESEND_API_KEY
  if (resendKey) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'PreRoll <noreply@preroll.io>',
          to: [client.email],
          subject: `You're invited to the ${client.name ? client.name + ' ' : ''}client portal`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
              <h1 style="font-size: 18px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 24px;">PREROLL</h1>
              <p style="font-size: 15px; color: #333; line-height: 1.6;">
                You've been invited to the PreRoll client portal where you can track your show's progress, review deliverables, and provide feedback.
              </p>
              <a href="${inviteUrl}" style="display: inline-block; margin: 24px 0; padding: 12px 24px; background-color: #7c3aed; color: #fff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600;">
                Access Your Portal
              </a>
              <p style="font-size: 13px; color: #888; line-height: 1.5; margin-top: 24px;">
                This link doesn't expire. If you have any questions, reply to this email.
              </p>
            </div>
          `,
        }),
      })
    } catch (err) {
      console.error('Failed to send invite email:', err)
    }
  }

  return jsonResponse({ invite_url: `/invite/${invite_code}`, invite_code, client: data, email_sent: !!resendKey }, 201)
}

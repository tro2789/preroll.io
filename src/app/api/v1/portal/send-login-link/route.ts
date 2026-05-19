import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'
import { getSiteUrl, sendEmail } from '@/lib/email/send'
import { emailTemplate } from '@/lib/email/template'

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
  if (!client.email) return errorResponse('Client has no email address', 400)

  let inviteCode = client.invite_code
  if (!inviteCode) {
    inviteCode = crypto.randomUUID()
    await supabase!
      .from('clients')
      .update({ invite_code: inviteCode })
      .eq('id', client.id)
  }

  const siteUrl = await getSiteUrl()
  const shareUrl = `${siteUrl}/share/${inviteCode}`
  const producerName = user!.user_metadata?.full_name || user!.email?.split('@')[0] || 'Your producer'

  const emailSent = await sendEmail(
    client.email,
    'Your preroll.io portal link',
    emailTemplate({
      greeting: `Hi ${client.name?.split(' ')[0] || 'there'},`,
      body: `<p style="margin: 0;">${producerName} shared your client portal with you. Click below to view your shows, track episode progress, and review deliverables.</p>`,
      cta: { label: 'Open Your Portal', url: shareUrl },
      footer: 'Bookmark this link to come back anytime.',
    }),
  )

  if (!emailSent) return errorResponse('Failed to send email', 500)
  return jsonResponse({ sent: true })
}

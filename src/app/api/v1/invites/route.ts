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
    emailTemplate({
      greeting: `Hi ${client.name?.split(' ')[0] || 'there'},`,
      body: `<p style="margin: 0;">${producerName} has set up a client portal for you on preroll.io${showNames.length > 0 ? ` for <strong>${showNames.join('</strong>, <strong>')}</strong>` : ''}. You'll be able to track episode progress, review deliverables, and leave feedback — all in one place.</p>`,
      cta: { label: 'Open Your Portal', url: shareUrl },
      footer: 'Bookmark this link to come back anytime.',
    }),
  )

  return jsonResponse({ invite_code, client: data, email_sent: emailSent }, 201)
}

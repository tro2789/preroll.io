import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'
import { headers } from 'next/headers'

function getAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function POST(request: Request) {
  const { supabase, user, error } = await getAuthenticatedClient()
  if (error) return error

  const body = await request.json()
  if (!body.client_id) return errorResponse('client_id is required')

  const [{ data: client, error: fetchError }, { data: shows }] = await Promise.all([
    supabase!
      .from('clients')
      .select('id, name, email, user_id')
      .eq('id', body.client_id)
      .single(),
    supabase!
      .from('shows')
      .select('name')
      .eq('client_id', body.client_id)
      .limit(5),
  ])

  if (fetchError || !client) return errorResponse('Client not found', 404)
  if (client.user_id !== user!.id) return errorResponse('Forbidden', 403)
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

  const headersList = await headers()
  const host = headersList.get('host') || 'dev.preroll.io'
  const protocol = host.includes('localhost') || host.includes('192.168') ? 'http' : 'https'
  const siteUrl = `${protocol}://${host}`
  const onboardingPath = `/portal/onboarding?invite=${invite_code}`
  const fallbackUrl = `${siteUrl}/invite/${invite_code}`

  const admin = getAdminClient()

  // Create user if they don't exist yet (confirmed, no password)
  await admin.auth.admin.createUser({
    email: client.email,
    email_confirm: true,
  })

  // Generate a one-click magic link
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: client.email,
  })

  let loginUrl = fallbackUrl
  if (!linkError && linkData?.properties?.hashed_token) {
    const tokenHash = linkData.properties.hashed_token
    loginUrl = `${siteUrl}/auth/confirm?token_hash=${tokenHash}&type=magiclink&next=${encodeURIComponent(onboardingPath)}`
  }

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
          subject: `${producerName} has invited you to PreRoll`,
          html: `
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
        }),
      })
    } catch (err) {
      console.error('Failed to send invite email:', err)
    }
  }

  return jsonResponse({ invite_code, client: data, email_sent: !!resendKey }, 201)
}

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getSiteUrl, generateMagicLinkUrl, sendEmail } from '@/lib/email/send'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params
  const service = createServiceClient()

  const { data: client } = await service
    .from('clients')
    .select('id, name, email, client_user_id, onboarded_at')
    .eq('invite_code', code)
    .single()

  if (!client || !client.email) {
    const errorUrl = request.nextUrl.clone()
    errorUrl.pathname = '/share/not-found'
    errorUrl.search = ''
    return NextResponse.redirect(errorUrl)
  }

  if (!client.client_user_id) {
    const { data: created, error: createErr } = await service.auth.admin.createUser({
      email: client.email,
      email_confirm: true,
    })

    let userId: string | null = null
    if (createErr) {
      const { data: { users } } = await service.auth.admin.listUsers()
      const existing = users?.find((u) => u.email === client.email)
      if (existing) userId = existing.id
    } else {
      userId = created.user.id
    }

    if (userId) {
      await service
        .from('clients')
        .update({
          client_user_id: userId,
          onboarded_at: client.onboarded_at || new Date().toISOString(),
        })
        .eq('id', client.id)
    }
  }

  const siteUrl = await getSiteUrl()
  const magicLinkUrl = await generateMagicLinkUrl(
    client.email,
    siteUrl,
    '/portal',
    `${siteUrl}/share/not-found`,
  )

  await sendEmail(
    client.email,
    'Sign in to your portal',
    `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="font-size: 18px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 24px;">PREROLL.IO</h1>
        <p style="font-size: 15px; color: #333; line-height: 1.6;">
          Hi ${client.name?.split(' ')[0] || 'there'},
        </p>
        <p style="font-size: 15px; color: #333; line-height: 1.6;">
          Click the button below to sign in to your client portal.
        </p>
        <a href="${magicLinkUrl}" style="display: inline-block; margin: 24px 0; padding: 12px 24px; background-color: #e86a47; color: #fff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600;">
          Sign In
        </a>
        <p style="font-size: 13px; color: #888; line-height: 1.5; margin-top: 24px;">
          This link expires in 1 hour. If you didn't request this, you can ignore this email.
        </p>
      </div>
    `,
  )

  const sentUrl = request.nextUrl.clone()
  sentUrl.pathname = '/share/check-email'
  sentUrl.search = `?email=${encodeURIComponent(client.email)}`
  return NextResponse.redirect(sentUrl)
}

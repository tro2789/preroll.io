import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getSiteUrl, generateMagicLinkUrl, sendEmail } from '@/lib/email/send'
import { emailTemplate } from '@/lib/email/template'

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

  // If the visitor already has a valid session for this client's email, skip straight to portal
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user && user.email === client.email) {
    const portalUrl = request.nextUrl.clone()
    portalUrl.pathname = '/portal'
    portalUrl.search = ''
    return NextResponse.redirect(portalUrl)
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

  const siteUrl = getSiteUrl()
  const magicLinkUrl = await generateMagicLinkUrl(
    client.email,
    siteUrl,
    '/portal',
    `${siteUrl}/share/not-found`,
  )

  await sendEmail(
    client.email,
    'Sign in to your portal',
    emailTemplate({
      greeting: `Hi ${client.name?.split(' ')[0] || 'there'},`,
      body: '<p style="margin: 0;">Click the button below to sign in to your client portal.</p>',
      cta: { label: 'Sign In', url: magicLinkUrl },
      footer: 'This link expires in 1 hour. If you didn\'t request this, you can ignore this email.',
    }),
  )

  const sentUrl = request.nextUrl.clone()
  sentUrl.pathname = '/share/check-email'
  sentUrl.search = `?email=${encodeURIComponent(client.email)}`
  return NextResponse.redirect(sentUrl)
}

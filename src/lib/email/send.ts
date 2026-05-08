import { headers } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/server'

export async function getSiteUrl(): Promise<string> {
  const headersList = await headers()
  const host = headersList.get('host') || 'dev.preroll.io'
  const protocol = host.includes('localhost') || host.includes('192.168') ? 'http' : 'https'
  return `${protocol}://${host}`
}

export async function generateMagicLinkUrl(
  email: string,
  siteUrl: string,
  redirectPath: string,
  fallbackUrl: string,
): Promise<string> {
  const service = createServiceClient()

  await service.auth.admin.createUser({ email, email_confirm: true }).catch(() => {})

  const { data: linkData, error: linkError } = await service.auth.admin.generateLink({
    type: 'magiclink',
    email,
  })

  if (!linkError && linkData?.properties?.hashed_token) {
    const tokenHash = linkData.properties.hashed_token
    const verifyType = linkData.properties.verification_type || 'magiclink'
    return `${siteUrl}/auth/verify?token_hash=${tokenHash}&type=${verifyType}&next=${encodeURIComponent(redirectPath)}`
  }

  if (linkError) {
    console.error('generateLink failed:', linkError.message)
  }

  return fallbackUrl
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
): Promise<boolean> {
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) return false

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'PreRoll <noreply@preroll.io>',
        to: [to],
        subject,
        html,
      }),
    })
    return res.ok
  } catch (err) {
    console.error('Failed to send email:', err)
    return false
  }
}

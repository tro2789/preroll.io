import { headers } from 'next/headers'
import nodemailer from 'nodemailer'
import { createServiceClient } from '@/lib/supabase/server'
import { isSelfHosted } from '@/lib/entitlements'

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

  const linkTypes = ['magiclink', 'recovery'] as const
  for (const linkType of linkTypes) {
    const { data: linkData, error: linkError } = await service.auth.admin.generateLink({
      type: linkType,
      email,
    })

    if (!linkError && linkData?.properties?.hashed_token) {
      const tokenHash = linkData.properties.hashed_token
      const verifyType = linkData.properties.verification_type || linkType
      return `${siteUrl}/auth/verify?token_hash=${tokenHash}&type=${verifyType}&next=${encodeURIComponent(redirectPath)}`
    }

    if (linkError) {
      console.error(`generateLink (${linkType}) failed for ${email}:`, linkError.message)
    }
  }

  return fallbackUrl
}

const smtpConfig = {
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587', 10) || 587,
  user: process.env.SMTP_USER,
  pass: process.env.SMTP_PASS,
  from: process.env.SMTP_FROM,
}

async function sendViaSmtp(
  to: string,
  subject: string,
  html: string,
): Promise<boolean> {
  if (!smtpConfig.host || !smtpConfig.from) {
    console.warn(
      'SMTP not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and SMTP_FROM to enable email in self-hosted mode.',
    )
    return false
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.port === 465,
      auth: smtpConfig.user && smtpConfig.pass ? { user: smtpConfig.user, pass: smtpConfig.pass } : undefined,
    })

    await transporter.sendMail({ from: smtpConfig.from, to, subject, html })
    return true
  } catch (err) {
    console.error('Failed to send email via SMTP:', err)
    return false
  }
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
): Promise<boolean> {
  if (isSelfHosted()) {
    return sendViaSmtp(to, subject, html)
  }

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
        from: 'preroll.io <noreply@preroll.io>',
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

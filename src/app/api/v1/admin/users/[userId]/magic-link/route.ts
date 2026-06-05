import { getAdminClient, logAdminAction } from '@/lib/admin/api-auth'
import { jsonResponse, errorResponse } from '@/lib/api/helpers'
import { getSiteUrl, generateMagicLinkUrl, sendEmail } from '@/lib/email/send'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { service, actor, error } = await getAdminClient()
  if (error) return error

  const { userId } = await params

  const { data: profile, error: profileError } = await service!
    .from('user_profiles')
    .select('email')
    .eq('user_id', userId)
    .single()

  if (profileError || !profile) {
    return errorResponse('User not found', 404)
  }

  if (!profile.email) {
    return errorResponse('User has no email address', 400)
  }

  const siteUrl = getSiteUrl()
  const loginUrl = await generateMagicLinkUrl(profile.email, siteUrl, '/app', `${siteUrl}/login`)

  const emailSent = await sendEmail(
    profile.email,
    'Your login link for PreRoll',
    `<p>Click below to sign in to PreRoll:</p><p><a href="${loginUrl}">Sign in to PreRoll</a></p><p>This link expires in 24 hours.</p>`,
  )

  if (!emailSent) {
    return errorResponse('Failed to send magic link email', 500)
  }

  await logAdminAction(service!, actor, 'user.magic_link', {
    type: 'user', id: userId, metadata: { email: profile.email },
  })

  return jsonResponse({
    email: profile.email,
    sent: true,
  })
}

import { getAdminClient } from '@/lib/admin/api-auth'
import { jsonResponse, errorResponse } from '@/lib/api/helpers'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { service, error } = await getAdminClient()
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

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dev.preroll.io'

  const { data: linkData, error: linkError } = await service!
    .auth.admin.generateLink({
      type: 'magiclink',
      email: profile.email,
      options: { redirectTo: siteUrl + '/app' },
    })

  if (linkError) {
    return errorResponse(linkError.message, 500)
  }

  return jsonResponse({ url: linkData.properties.action_link })
}

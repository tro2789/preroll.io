import { cookies } from 'next/headers'
import { ORG_COOKIE_NAME } from '@/lib/constants/plans'

const ORG_COOKIE_OPTIONS = {
  path: '/',
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 60 * 60 * 24 * 365,
}

export async function setOrgCookie(orgId: string) {
  const cookieStore = await cookies()
  cookieStore.set(ORG_COOKIE_NAME, orgId, ORG_COOKIE_OPTIONS)
}

export async function clearOrgCookie() {
  const cookieStore = await cookies()
  cookieStore.delete(ORG_COOKIE_NAME)
}

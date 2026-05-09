import { cookies } from 'next/headers'

export const PLAN_LABELS: Record<string, string> = {
  free: 'Free',
  pro: 'Pro',
  studio: 'Studio',
}

export const ORG_COOKIE_NAME = 'preroll_org'

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

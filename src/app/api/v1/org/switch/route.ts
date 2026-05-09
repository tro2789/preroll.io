import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const orgId = body.orgId?.trim()
  if (!orgId) {
    return NextResponse.json({ error: 'orgId is required' }, { status: 400 })
  }

  const service = createServiceClient()
  const { data: membership } = await service
    .from('memberships')
    .select('org_id, role')
    .eq('user_id', user.id)
    .eq('org_id', orgId)
    .single()

  if (!membership) {
    return NextResponse.json({ error: 'You are not a member of this organization' }, { status: 403 })
  }

  const cookieStore = await cookies()
  cookieStore.set('preroll_org', orgId, {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
  })

  return NextResponse.json({ data: { orgId, role: membership.role } })
}

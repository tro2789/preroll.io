import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params
  const service = createServiceClient()

  const { data: client } = await service
    .from('clients')
    .select('id, name, email, client_user_id, onboarded_at, portal_auth_token')
    .eq('invite_code', code)
    .single()

  if (!client || !client.email) {
    const errorUrl = request.nextUrl.clone()
    errorUrl.pathname = '/share/not-found'
    errorUrl.search = ''
    return NextResponse.redirect(errorUrl)
  }

  let authToken = client.portal_auth_token
  let userId = client.client_user_id

  if (!authToken) {
    authToken = crypto.randomUUID()
    await service
      .from('clients')
      .update({ portal_auth_token: authToken })
      .eq('id', client.id)
  }

  if (!userId) {
    const { data: created, error: createErr } = await service.auth.admin.createUser({
      email: client.email,
      password: authToken,
      email_confirm: true,
    })

    if (createErr) {
      const { data: { users } } = await service.auth.admin.listUsers()
      const existing = users?.find((u) => u.email === client.email)
      if (existing) {
        userId = existing.id
        await service.auth.admin.updateUserById(userId, { password: authToken })
      }
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
  } else {
    await service.auth.admin.updateUserById(userId, { password: authToken })
  }

  const redirectUrl = request.nextUrl.clone()
  redirectUrl.pathname = '/portal'
  redirectUrl.search = ''
  const response = NextResponse.redirect(redirectUrl)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: client.email,
    password: authToken,
  })

  if (signInError) {
    const errorUrl = request.nextUrl.clone()
    errorUrl.pathname = '/share/not-found'
    errorUrl.search = ''
    return NextResponse.redirect(errorUrl)
  }

  return response
}

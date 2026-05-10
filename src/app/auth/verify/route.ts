import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const next = searchParams.get('next') || '/portal'

  const redirectUrl = request.nextUrl.clone()

  if (!tokenHash || !type) {
    redirectUrl.pathname = '/login'
    redirectUrl.search = ''
    return NextResponse.redirect(redirectUrl)
  }

  const response = NextResponse.next()

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

  const typesToTry: string[] = [type]
  if (type === 'magiclink') typesToTry.push('email')
  if (type === 'recovery') typesToTry.push('magiclink', 'email')
  if (type === 'email') typesToTry.push('magiclink')

  let verified = false

  for (const t of typesToTry) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: t as 'magiclink' | 'email' | 'recovery' | 'signup',
    })
    if (!error) {
      verified = true
      break
    }
  }

  if (!verified) {
    redirectUrl.pathname = '/auth/verify-failed'
    redirectUrl.search = ''
    return NextResponse.redirect(redirectUrl)
  }

  redirectUrl.pathname = next
  redirectUrl.search = ''

  const redirect = NextResponse.redirect(redirectUrl)
  response.cookies.getAll().forEach((cookie) => {
    redirect.cookies.set(cookie.name, cookie.value, {
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
    })
  })

  return redirect
}

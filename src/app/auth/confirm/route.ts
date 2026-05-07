import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/portal'

  if (tokenHash && type) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })

    if (!error && data?.session) {
      if (type === 'recovery') {
        return NextResponse.redirect(`${origin}/reset-password`)
      }
      return NextResponse.redirect(`${origin}${next}`)
    }

    // If magiclink type fails, try email type (generateLink may use different type)
    if (error && type === 'magiclink') {
      const { data: retryData, error: retryError } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: 'email',
      })
      if (!retryError && retryData?.session) {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }

    console.error('OTP verification failed:', { error: error?.message, type, hasToken: !!tokenHash })
  }

  return NextResponse.redirect(`${origin}/login?error=auth`)
}

'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function VerifyPage() {
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const tokenHash = searchParams.get('token_hash')
    const type = searchParams.get('type') as 'magiclink' | 'email' | 'signup'
    const next = searchParams.get('next') || '/portal'

    if (!tokenHash || !type) {
      setError('Invalid verification link.')
      return
    }

    async function verify() {
      const supabase = createClient()
      const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash!, type })

      if (error) {
        // Try email type as fallback
        if (type === 'magiclink') {
          const { error: retryError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash!,
            type: 'email',
          })
          if (!retryError) {
            window.location.href = next
            return
          }
        }
        setError('This link has expired or already been used. Ask your producer to resend the invite.')
        return
      }

      window.location.href = next
    }

    verify()
  }, [searchParams])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-base px-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <h1 className="text-2xl font-bold tracking-widest uppercase text-text-primary">PREROLL</h1>
          <div className="rounded-md bg-error/10 border border-error/30 px-4 py-3 text-sm text-error">
            {error}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-base">
      <p className="text-text-secondary">Signing you in...</p>
    </div>
  )
}

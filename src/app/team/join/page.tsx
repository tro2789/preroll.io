'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

function JoinContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [joining, setJoining] = useState(true)
  const [orgName, setOrgName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setError('No invite token provided.')
      setJoining(false)
      return
    }

    async function join() {
      try {
        const res = await fetch('/api/v1/team/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        })
        const json = await res.json()
        if (!res.ok) {
          throw new Error(json.error || 'Failed to join team')
        }
        setOrgName(json.data?.organization?.name || 'the team')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      } finally {
        setJoining(false)
      }
    }
    join()
  }, [token])

  if (joining) {
    return <p className="text-text-secondary">Joining team...</p>
  }

  if (error) {
    return (
      <div className="w-full max-w-sm text-center space-y-4">
        <h1 className="text-2xl font-bold tracking-widest uppercase text-text-primary">PreRoll</h1>
        <div className="rounded-md bg-error/10 border border-error/30 px-3 py-2.5 text-sm text-error">
          {error}
        </div>
        <Link
          href="/login"
          className="inline-block text-sm text-accent hover:text-accent-hover transition-colors"
        >
          Go to login
        </Link>
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm text-center space-y-4">
      <h1 className="text-2xl font-bold tracking-widest uppercase text-text-primary">PreRoll</h1>
      <div className="rounded-lg bg-surface-raised p-6 border border-border-subtle space-y-3">
        <svg className="mx-auto h-10 w-10 text-success" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
        </svg>
        <p className="text-lg font-semibold text-text-primary">
          You&apos;ve joined {orgName}!
        </p>
        <p className="text-sm text-text-secondary">
          You now have access to the organization&apos;s shows, episodes, and workflows.
        </p>
      </div>
      <Link
        href="/app"
        className="inline-block w-full rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover transition-colors"
      >
        Go to Dashboard
      </Link>
    </div>
  )
}

export default function TeamJoinPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-base px-4">
      <Suspense fallback={<p className="text-text-secondary">Loading...</p>}>
        <JoinContent />
      </Suspense>
    </div>
  )
}

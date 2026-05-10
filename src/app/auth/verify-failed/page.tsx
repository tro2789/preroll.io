import Link from 'next/link'

export default function VerifyFailedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-base px-4">
      <div className="w-full max-w-sm text-center space-y-4">
        <h1 className="text-2xl font-bold tracking-widest uppercase text-text-primary">PREROLL.IO</h1>
        <div className="rounded-md bg-error/10 border border-error/30 px-4 py-3 text-sm text-error">
          This link has expired or already been used. Ask your producer to resend the login link.
        </div>
        <Link
          href="/login"
          className="inline-block text-sm text-accent hover:text-accent-hover transition-colors"
        >
          Go to login
        </Link>
      </div>
    </div>
  )
}

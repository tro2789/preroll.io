export default async function CheckEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>
}) {
  const { email } = await searchParams
  const maskedEmail = email
    ? email.replace(/^(.{2})(.*)(@.*)$/, (_, start, middle, domain) =>
        start + middle.replace(/./g, '*') + domain
      )
    : 'your email'

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-base px-4">
      <div className="w-full max-w-sm text-center space-y-5">
        <h1 className="text-2xl font-bold tracking-widest uppercase text-text-primary">PREROLL.IO</h1>

        <div className="rounded-lg border border-border-subtle bg-surface-raised p-6 space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-accent">
              <path d="M1.5 8.67v8.58a3 3 0 003 3h15a3 3 0 003-3V8.67l-8.928 5.493a3 3 0 01-3.144 0L1.5 8.67z" />
              <path d="M22.5 6.908V6.75a3 3 0 00-3-3h-15a3 3 0 00-3 3v.158l9.714 5.978a1.5 1.5 0 001.572 0L22.5 6.908z" />
            </svg>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-text-primary">Check your email</h2>
            <p className="text-sm text-text-secondary mt-2">
              We sent a sign-in link to <span className="font-medium text-text-primary">{maskedEmail}</span>. Click the link in the email to access your portal.
            </p>
          </div>

          <p className="text-xs text-text-tertiary">
            The link expires in 1 hour. Check your spam folder if you don't see it.
          </p>
        </div>
      </div>
    </div>
  )
}

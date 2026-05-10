export default function ShareNotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-base px-4">
      <div className="w-full max-w-sm text-center space-y-4">
        <h1 className="text-2xl font-bold tracking-widest uppercase text-text-primary">PREROLL.IO</h1>
        <div className="rounded-md bg-error/10 border border-error/30 px-4 py-3 text-sm text-error">
          This link is invalid or has expired. Ask your producer to send a new one.
        </div>
      </div>
    </div>
  )
}

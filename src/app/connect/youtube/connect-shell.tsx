export function ConnectShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-base p-4">
      <div className="w-full max-w-md rounded-xl border border-border-default bg-surface-raised p-8 shadow-lg">
        {children}
        <div className="mt-8 border-t border-border-subtle pt-4 text-center">
          <p className="text-xs text-text-tertiary">Powered by PreRoll.io</p>
        </div>
      </div>
    </div>
  )
}

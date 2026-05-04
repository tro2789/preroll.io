'use client'

interface HeaderProps {
  email: string
}

export function Header({ email }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-zinc-900 border-b border-zinc-800">
      <div className="flex items-center justify-between h-14 px-4 sm:px-6">
        {/* Mobile logo */}
        <span className="md:hidden text-lg font-bold text-white tracking-tight">PreRoll</span>
        {/* Spacer for desktop (sidebar takes left) */}
        <div className="hidden md:block" />

        <div className="flex items-center gap-4">
          <span className="text-sm text-zinc-400 hidden sm:inline">{email}</span>
          <form action="/auth/signout" method="POST">
            <button
              type="submit"
              className="text-sm text-zinc-400 hover:text-white px-3 py-1.5 rounded-md border border-zinc-700 hover:border-zinc-600 transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  )
}

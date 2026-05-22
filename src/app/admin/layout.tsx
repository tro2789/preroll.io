import Link from 'next/link'
import { requireSuperAdmin } from '@/lib/admin/auth'
import { AdminNav } from './admin-nav'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireSuperAdmin()

  return (
    <div className="min-h-screen bg-surface-base">
      <header className="bg-surface-raised border-b border-border-default">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-text-primary">PreRoll Admin</h1>
            <span className="rounded-full bg-warning/15 px-2.5 py-0.5 text-xs font-medium text-warning">
              Cloud
            </span>
          </div>
          <Link
            href="/app"
            className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
          >
            Back to app
          </Link>
        </div>
      </header>

      <nav className="border-b border-border-default bg-surface-raised">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 overflow-x-auto overflow-y-hidden scrollbar-hide">
          <div className="flex gap-1 min-w-max">
            <AdminNav />
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-4 sm:px-6 mt-6 pb-12">
        {children}
      </main>
    </div>
  )
}

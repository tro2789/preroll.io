'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const sections = [
  {
    title: 'API',
    items: [
      { label: 'API Keys', href: '/docs/api-keys' },
      { label: 'Webhooks', href: '/docs/webhooks' },
      { label: 'MCP Server', href: '/docs/mcp' },
    ],
  },
]

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-surface-base">
      <header className="border-b border-border-subtle px-6 py-4">
        <div className="mx-auto max-w-6xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm font-semibold uppercase tracking-widest text-text-primary">
              PreRoll
            </Link>
            <span className="text-text-tertiary">/</span>
            <span className="text-sm text-text-secondary">Docs</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-text-tertiary hover:text-text-primary transition-colors">Sign in</Link>
            <Link href="/signup" className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-hover transition-colors">Get Started</Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-10 flex gap-10">
        <nav className="hidden md:block w-48 shrink-0">
          <div className="space-y-5">
            {sections.map((section) => (
              <div key={section.title}>
                <p className="text-xs font-medium text-text-secondary">{section.title}</p>
                <ul className="mt-1.5 space-y-0.5">
                  {section.items.map((item) => {
                    const isActive = pathname.startsWith(item.href)
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={`block rounded-md px-2.5 py-1.5 text-sm transition-colors ${
                            isActive
                              ? 'bg-accent-muted text-accent-hover'
                              : 'text-text-tertiary hover:text-text-primary hover:bg-surface-raised'
                          }`}
                        >
                          {item.label}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>
        </nav>
        <article className="min-w-0 flex-1 max-w-3xl">{children}</article>
      </div>
    </div>
  )
}

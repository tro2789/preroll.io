'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const sections = [
  {
    title: 'Integrations',
    items: [
      { label: 'Webhooks', href: '/app/docs/webhooks' },
    ],
  },
]

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex gap-10">
      <nav className="hidden md:block w-48 shrink-0">
        <h2 className="text-xs font-medium uppercase tracking-wider text-text-tertiary">Docs</h2>
        <div className="mt-4 space-y-5">
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
  )
}

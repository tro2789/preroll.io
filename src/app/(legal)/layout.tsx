import Link from 'next/link'
import { LogoIcon } from '@/components/ui/logo'
import { ChatwootWidget } from '@/components/chatwoot/chatwoot-widget'

function Nav() {
  return (
    <nav className="border-b border-border-subtle bg-surface-base/80 backdrop-blur-md sticky top-0 z-50">
      <div className="flex items-center gap-7 h-[60px] max-w-[1200px] mx-auto px-7">
        <Link href="/" className="flex items-center gap-2.5 font-[family-name:var(--font-display)] font-bold text-[16.5px] tracking-[-0.02em]">
          <span className="w-[26px] h-[26px] rounded-[7px] grid place-items-center text-sm font-bold shadow-[0_4px_14px_-4px_oklch(0.715_0.155_40/0.6)]" style={{ background: 'linear-gradient(150deg, var(--color-accent), oklch(0.62 0.16 18))', color: 'white' }}>
            <LogoIcon className="w-[15px] h-[15px]" />
          </span>
          <span className="text-text-primary">PreRoll<span className="text-accent">.io</span></span>
        </Link>
        <div className="hidden sm:flex gap-1 ml-2">
          {[
            ['Product', '/#features'],
            ['Docs', '/docs'],
            ['Blog', '/blog'],
          ].map(([label, href]) => (
            <Link key={label} href={href} className="px-[11px] py-[7px] rounded-[6px] text-sm text-text-secondary font-[450] hover:text-text-primary hover:bg-surface-raised transition-colors">
              {label}
            </Link>
          ))}
        </div>
        <div className="ml-auto">
          <Link href="/signup" className="inline-flex items-center gap-2 px-4 py-2 rounded-[7px] text-sm font-semibold bg-accent text-white hover:bg-accent-hover transition-colors">
            Start free trial
          </Link>
        </div>
      </div>
    </nav>
  )
}

function Footer() {
  return (
    <footer className="border-t border-border-subtle py-8 px-7">
      <div className="max-w-[1200px] mx-auto flex flex-col gap-4 text-[12.5px] text-fg-faint">
        <div className="flex items-center justify-between">
          <span>&copy; {new Date().getFullYear()} PreRoll.io</span>
          <div className="flex gap-5">
            <Link href="/docs" className="hover:text-text-secondary transition-colors">Docs</Link>
            <Link href="/privacy" className="hover:text-text-secondary transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-text-secondary transition-colors">Terms</Link>
          </div>
        </div>
        <span>A product of <a href="https://trevorohare.com" className="text-text-secondary hover:text-text-primary transition-colors">Trevor O&apos;Hare Productions</a></span>
      </div>
    </footer>
  )
}

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface-base flex flex-col">
      <Nav />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
      <ChatwootWidget />
    </div>
  )
}

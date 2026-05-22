import type { Metadata } from 'next'
import { ChatwootWidget } from '@/components/chatwoot/chatwoot-widget'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <ChatwootWidget />
    </>
  )
}

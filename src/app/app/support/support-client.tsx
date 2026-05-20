'use client'

import Link from 'next/link'
import { ChatwootSupport } from '@/components/chatwoot/chatwoot-widget'

interface SupportPageClientProps {
  identity: {
    userId: string
    email: string
    name?: string
    planId: string
    orgName?: string
  }
}

export function SupportPageClient({ identity }: SupportPageClientProps) {
  const isStudio = identity.planId === 'studio'

  return (
    <div className="max-w-4xl">
      <ChatwootSupport identity={identity} />

      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Support</h1>
        {isStudio && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-accent-tint text-accent border border-accent-muted">
            <StarIcon className="h-3 w-3" />
            Priority Support
          </span>
        )}
      </div>

      {isStudio && (
        <div className="rounded-lg border border-accent-muted bg-accent-tint/50 px-4 py-3 mb-6">
          <p className="text-sm text-text-primary">
            As a Studio subscriber, your messages are flagged as priority. Expect faster response times.
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        <SupportCard
          icon={<ChatIcon className="h-5 w-5" />}
          title="Live Chat"
          description="Chat with us in real time. The chat widget opens automatically on this page."
        />
        <SupportCard
          icon={<BookIcon className="h-5 w-5" />}
          title="Documentation"
          description="Guides, API reference, and integration docs."
          href="/docs"
        />
        <SupportCard
          icon={<MailIcon className="h-5 w-5" />}
          title="Email"
          description="Reach us directly for account or billing questions."
          href="mailto:support@preroll.io"
        />
      </div>

      <div className="rounded-lg border border-border-default bg-surface-raised p-5">
        <h2 className="text-lg font-semibold text-text-primary mb-2">Frequently Asked Questions</h2>
        <div className="space-y-4 mt-4">
          <FaqItem
            question="How do I connect Frame.io or Google Drive?"
            answer="Go to Settings > Integrations and click Connect next to the provider you want. You'll be guided through the OAuth flow."
          />
          <FaqItem
            question="How does the AI pipeline work?"
            answer="Upload audio or video to an episode. PreRoll automatically transcribes it with Deepgram, then generates show notes, descriptions, and social posts with Claude AI."
          />
          <FaqItem
            question="What happens when my free trial ends?"
            answer="Your account downgrades to the Free plan. You keep your data, but advanced features (integrations, AI, team members) become unavailable until you upgrade."
          />
          <FaqItem
            question="How do I invite team members?"
            answer="Studio plan subscribers can invite team members from Settings > Team. Enter their email and assign a role (admin or member)."
          />
        </div>
      </div>
    </div>
  )
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  return (
    <div className="border-b border-border-subtle pb-4 last:border-0 last:pb-0">
      <h3 className="text-sm font-medium text-text-primary">{question}</h3>
      <p className="text-sm text-text-secondary mt-1">{answer}</p>
    </div>
  )
}

function SupportCard({ icon, title, description, href }: { icon: React.ReactNode; title: string; description: string; href?: string }) {
  const content = (
    <div className="rounded-lg border border-border-default bg-surface-raised p-4 transition-colors hover:bg-surface-overlay hover:border-border-strong h-full">
      <div className="flex items-center gap-2.5 mb-2">
        <div className="text-accent">{icon}</div>
        <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
      </div>
      <p className="text-xs text-text-secondary leading-relaxed">{description}</p>
    </div>
  )

  if (href) {
    const isExternal = href.startsWith('mailto:') || href.startsWith('http')
    if (isExternal) {
      return <a href={href}>{content}</a>
    }
    return <Link href={href}>{content}</Link>
  }

  return content
}

function StarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  )
}

function ChatIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
    </svg>
  )
}

function BookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
    </svg>
  )
}

function MailIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
    </svg>
  )
}

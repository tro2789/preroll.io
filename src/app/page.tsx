import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function LandingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/app')

  return (
    <div className="min-h-screen bg-surface-base">
      <Nav />
      <Hero />
      <Features />
      <Pricing />
      <Footer />
    </div>
  )
}

function Nav() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border-subtle/50 bg-surface-base/80 backdrop-blur-lg">
      <div className="mx-auto max-w-6xl flex items-center justify-between px-6 py-4">
        <Link href="/" className="text-sm font-semibold uppercase tracking-widest text-text-primary">
          PreRoll
        </Link>
        <nav className="hidden sm:flex items-center gap-6">
          <a href="#features" className="text-sm text-text-tertiary hover:text-text-primary transition-colors">Features</a>
          <a href="#pricing" className="text-sm text-text-tertiary hover:text-text-primary transition-colors">Pricing</a>
          <Link href="/app/docs" className="text-sm text-text-tertiary hover:text-text-primary transition-colors">Docs</Link>
        </nav>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm text-text-tertiary hover:text-text-primary transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover transition-colors"
          >
            Get Started
          </Link>
        </div>
      </div>
    </header>
  )
}

function Hero() {
  return (
    <section className="relative flex min-h-screen items-center justify-center px-6 pt-20">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-text-primary leading-[1.1]">
          Your clients&apos; podcasts deserve better than spreadsheets and Slack threads.
        </h1>
        <p className="mt-6 text-lg sm:text-xl text-text-secondary max-w-2xl mx-auto leading-relaxed">
          PreRoll is the production pipeline for podcast producers who manage multiple shows.
          Track episodes, collect approvals, publish. One place.
        </p>
        <div className="mt-10">
          <Link
            href="/signup"
            className="inline-block rounded-lg bg-accent px-8 py-3.5 text-base font-semibold text-white hover:bg-accent-hover transition-colors"
          >
            Start Free
          </Link>
        </div>
      </div>
    </section>
  )
}

const FEATURES = [
  {
    title: 'Episode Pipeline',
    description: 'Drag episodes through customizable stages from planning to published. See every show at a glance.',
    icon: PipelineIcon,
  },
  {
    title: 'Client Portal',
    description: 'Clients log in with a magic link, see their show status, and approve deliverables. No passwords, no training.',
    icon: PortalIcon,
  },
  {
    title: 'Integrations',
    description: 'Connect Frame.io, Google Drive, Vimeo, and Transistor.fm. Review files and publish without leaving PreRoll.',
    icon: IntegrationsIcon,
  },
  {
    title: 'Calendar',
    description: 'See every episode across every show on one calendar. Filter by show, switch between week and month views.',
    icon: CalendarIcon,
  },
  {
    title: 'Webhooks & API',
    description: 'Automate your workflow. Signed webhook payloads fire on every status change. Full REST API with key auth.',
    icon: ApiIcon,
  },
  {
    title: 'MCP Server',
    description: 'Let your AI assistant manage episodes, check dashboards, and create clients through the PreRoll MCP server.',
    icon: McpIcon,
  },
]

function Features() {
  return (
    <section id="features" className="px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-center text-xs font-medium uppercase tracking-widest text-text-tertiary">
          Features
        </h2>
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-border-subtle bg-surface-raised p-6 transition-colors hover:border-border-hover"
            >
              <feature.icon className="h-8 w-8 text-accent" />
              <h3 className="mt-4 text-base font-semibold text-text-primary">{feature.title}</h3>
              <p className="mt-2 text-sm text-text-secondary leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

const TIERS = [
  {
    name: 'Free',
    price: '$0',
    period: '',
    description: 'Try it out with one client.',
    features: [
      '1 client, 1 show',
      'Episode pipeline with drag-and-drop',
      'Client portal with magic-link auth',
      'Calendar view',
    ],
    cta: 'Get Started',
    href: '/signup',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '$29',
    period: '/mo',
    description: 'For producers managing multiple shows.',
    features: [
      'Unlimited clients and shows',
      'All integrations (Frame.io, Transistor, Drive, Vimeo)',
      'Webhook egress and API keys',
      'MCP server access',
      'Episode templates',
      'Deliverable approval workflows',
    ],
    cta: 'Start Free, Upgrade Anytime',
    href: '/signup',
    highlighted: true,
  },
  {
    name: 'Studio',
    price: '$79',
    period: '/mo',
    description: 'For teams and agencies.',
    features: [
      'Everything in Pro',
      ['Multi-user access', true],
      ['White-label client portal', true],
      ['Reporting and analytics', true],
      ['SSO / SAML', true],
      'Priority support',
    ],
    cta: 'Contact Us',
    href: 'mailto:trevor@preroll.io',
    highlighted: false,
  },
]

function Pricing() {
  return (
    <section id="pricing" className="px-6 py-24">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center text-xs font-medium uppercase tracking-widest text-text-tertiary">
          Pricing
        </h2>
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-5">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`rounded-xl border p-6 flex flex-col ${
                tier.highlighted
                  ? 'border-accent bg-surface-raised'
                  : 'border-border-subtle bg-surface-raised'
              }`}
            >
              <h3 className="text-lg font-semibold text-text-primary">{tier.name}</h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-bold text-text-primary">{tier.price}</span>
                {tier.period && <span className="text-sm text-text-tertiary">{tier.period}</span>}
              </div>
              <p className="mt-2 text-sm text-text-secondary">{tier.description}</p>
              <ul className="mt-6 space-y-2.5 flex-1">
                {tier.features.map((feature) => {
                  const isComingSoon = Array.isArray(feature)
                  const label = isComingSoon ? feature[0] : feature
                  return (
                    <li key={String(label)} className="flex items-start gap-2 text-sm">
                      <CheckIcon className="h-4 w-4 mt-0.5 shrink-0 text-success" />
                      <span className="text-text-secondary">
                        {label as string}
                        {isComingSoon && (
                          <span className="ml-1.5 rounded-full bg-surface-overlay px-2 py-0.5 text-xs text-text-tertiary">
                            Soon
                          </span>
                        )}
                      </span>
                    </li>
                  )
                })}
              </ul>
              <Link
                href={tier.href}
                className={`mt-6 block rounded-lg py-2.5 text-center text-sm font-semibold transition-colors ${
                  tier.highlighted
                    ? 'bg-accent text-white hover:bg-accent-hover'
                    : 'bg-surface-overlay text-text-primary hover:bg-surface-input border border-border-default'
                }`}
              >
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>
        <p className="mt-8 text-center text-sm text-text-tertiary">
          Want to run it yourself?{' '}
          <Link href="/app/docs" className="text-accent hover:text-accent-hover transition-colors">
            PreRoll is open source and self-hostable.
          </Link>
        </p>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t border-border-subtle px-6 py-12">
      <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-start justify-between gap-8">
        <div className="flex gap-12">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-text-tertiary">Product</p>
            <ul className="mt-3 space-y-2">
              <li><a href="#features" className="text-sm text-text-secondary hover:text-text-primary transition-colors">Features</a></li>
              <li><a href="#pricing" className="text-sm text-text-secondary hover:text-text-primary transition-colors">Pricing</a></li>
              <li><Link href="/app/docs" className="text-sm text-text-secondary hover:text-text-primary transition-colors">Docs</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-text-tertiary">Developers</p>
            <ul className="mt-3 space-y-2">
              <li><Link href="/app/docs/api-keys" className="text-sm text-text-secondary hover:text-text-primary transition-colors">API Docs</Link></li>
              <li><Link href="/app/docs/mcp" className="text-sm text-text-secondary hover:text-text-primary transition-colors">MCP Server</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-text-tertiary">Account</p>
            <ul className="mt-3 space-y-2">
              <li><Link href="/login" className="text-sm text-text-secondary hover:text-text-primary transition-colors">Sign In</Link></li>
              <li><Link href="/signup" className="text-sm text-text-secondary hover:text-text-primary transition-colors">Sign Up</Link></li>
            </ul>
          </div>
        </div>
        <p className="text-xs text-text-tertiary">&copy; {new Date().getFullYear()} PreRoll</p>
      </div>
    </footer>
  )
}

function PipelineIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v12.75c0 .621.504 1.125 1.125 1.125Z" />
    </svg>
  )
}

function PortalIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
    </svg>
  )
}

function IntegrationsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
    </svg>
  )
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
    </svg>
  )
}

function ApiIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" />
    </svg>
  )
}

function McpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  )
}

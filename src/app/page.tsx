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
      <Pipeline />
      <Features />
      <BuiltBy />
      <Pricing />
      <FinalCta />
      <Footer />
    </div>
  )
}

// ─── Nav ────────────────────────────────────────────────────────────────────

function Nav() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border-subtle/50 bg-surface-base/80 backdrop-blur-lg">
      <div className="mx-auto max-w-7xl flex items-center justify-between px-6 py-4">
        <Link href="/" className="font-[family-name:var(--font-display)] text-sm font-bold uppercase tracking-widest text-text-primary">
          PreRoll
        </Link>
        <nav className="hidden sm:flex items-center gap-6">
          <a href="#pipeline" className="text-sm text-text-tertiary hover:text-text-primary transition-colors">How It Works</a>
          <a href="#features" className="text-sm text-text-tertiary hover:text-text-primary transition-colors">Features</a>
          <a href="#pricing" className="text-sm text-text-tertiary hover:text-text-primary transition-colors">Pricing</a>
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-text-tertiary hover:text-text-primary transition-colors">
            Sign in
          </Link>
          <Link
            href="/signup"
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover transition-colors"
          >
            Start Free
          </Link>
        </div>
      </div>
    </header>
  )
}

// ─── Hero ───────────────────────────────────────────────────────────────────

const MOCK_EPISODES = [
  { title: 'The Sleep Episode', num: 'EP 14', stage: 'Editing', color: 'var(--color-status-editing)' },
  { title: 'Interview: Dr. Park', num: 'EP 15', stage: 'Recording', color: 'var(--color-status-recording)' },
  { title: 'Memory & Music', num: 'EP 16', stage: 'Planning', color: 'var(--color-status-planning)' },
  { title: 'Season Finale', num: 'EP 13', stage: 'Review', color: 'var(--color-status-review)' },
  { title: 'Neuroplasticity 101', num: 'EP 12', stage: 'Approved', color: 'var(--color-status-approved)' },
]

function Hero() {
  return (
    <section className="relative pt-28 pb-20 px-6 overflow-hidden">
      <div className="mx-auto max-w-7xl grid lg:grid-cols-[1fr_1.1fr] gap-12 lg:gap-16 items-center">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl lg:text-[3.5rem] font-bold tracking-tight text-text-primary leading-[1.08]">
            Stop juggling shows across spreadsheets and Slack threads.
          </h1>
          <p className="mt-6 text-lg text-text-secondary leading-relaxed max-w-xl">
            PreRoll is the production pipeline built for podcast producers who manage
            multiple client shows. Track every episode, collect approvals, publish. One place.
          </p>
          <div className="mt-8 flex items-center gap-4">
            <Link
              href="/signup"
              className="rounded-lg bg-accent px-7 py-3 text-sm font-semibold text-white hover:bg-accent-hover transition-colors"
            >
              Start Free
            </Link>
            <a
              href="#pipeline"
              className="text-sm font-medium text-text-tertiary hover:text-text-primary transition-colors"
            >
              See how it works &darr;
            </a>
          </div>
        </div>

        {/* Stylized pipeline mockup */}
        <div className="relative" aria-hidden="true">
          <div className="rounded-xl border border-border-subtle bg-surface-raised p-5 shadow-2xl shadow-black/30">
            <div className="flex items-center gap-2 mb-4">
              <span className="h-2.5 w-2.5 rounded-full bg-text-tertiary/30" />
              <span className="h-2.5 w-2.5 rounded-full bg-text-tertiary/30" />
              <span className="h-2.5 w-2.5 rounded-full bg-text-tertiary/30" />
              <span className="ml-3 text-xs text-text-tertiary font-[family-name:var(--font-display)]">Brain Waves — Episode Pipeline</span>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {['Planning', 'Recording', 'Editing', 'Review', 'Approved'].map((stage) => (
                <div key={stage} className="text-center">
                  <span className="text-[10px] font-medium text-text-tertiary uppercase tracking-wider">{stage}</span>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-5 gap-2 mt-2">
              {MOCK_EPISODES.map((ep) => {
                const colMap: Record<string, number> = { Planning: 3, Recording: 2, Editing: 1, Review: 4, Approved: 5 }
                const col = colMap[ep.stage] || 1
                return (
                  <div
                    key={ep.num}
                    className="rounded-lg border border-border-subtle bg-surface-overlay p-2.5"
                    style={{ gridColumn: col }}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: ep.color }} />
                      <span className="text-[10px] text-text-tertiary">{ep.num}</span>
                    </div>
                    <p className="text-xs text-text-primary leading-tight">{ep.title}</p>
                  </div>
                )
              })}
            </div>
            {/* Activity strip */}
            <div className="mt-4 border-t border-border-subtle pt-3">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-status-approved" />
                <span className="text-[10px] text-text-tertiary">EP 11 &ldquo;Deep Focus&rdquo; published 2h ago</span>
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-status-review" />
                <span className="text-[10px] text-text-tertiary">Client approved rough cut for EP 13</span>
              </div>
            </div>
          </div>
          {/* Glow behind the mockup */}
          <div className="absolute -inset-10 -z-10 rounded-3xl bg-accent/5 blur-3xl" />
        </div>
      </div>
    </section>
  )
}

// ─── Pipeline ───────────────────────────────────────────────────────────────

const STAGES = [
  { name: 'Planning', color: 'var(--color-status-planning)', desc: 'Outline, guests, scheduling' },
  { name: 'Recording', color: 'var(--color-status-recording)', desc: 'Capture the session' },
  { name: 'Editing', color: 'var(--color-status-editing)', desc: 'Cut, mix, polish' },
  { name: 'Review', color: 'var(--color-status-review)', desc: 'Client listens and approves' },
  { name: 'Approved', color: 'var(--color-status-approved)', desc: 'Ready for publish' },
  { name: 'Published', color: 'var(--color-status-published)', desc: 'Live on Transistor' },
]

function Pipeline() {
  return (
    <section id="pipeline" className="px-6 py-24 scroll-mt-20">
      <div className="mx-auto max-w-7xl">
        <p className="font-[family-name:var(--font-display)] text-xs font-semibold uppercase tracking-widest text-accent">
          How it works
        </p>
        <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl sm:text-4xl font-bold text-text-primary leading-tight max-w-2xl">
          Every episode flows through a pipeline you control.
        </h2>
        <p className="mt-4 text-base text-text-secondary max-w-xl">
          Customize stages per show. Drag episodes between them. Status updates automatically. Your clients see progress without asking.
        </p>

        <div className="mt-14 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px bg-border-subtle rounded-xl overflow-hidden">
          {STAGES.map((stage) => (
            <div key={stage.name} className="bg-surface-raised p-5 flex flex-col items-center text-center">
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: stage.color }}
              />
              <span className="mt-3 font-[family-name:var(--font-display)] text-sm font-semibold text-text-primary">{stage.name}</span>
              <span className="mt-1 text-xs text-text-tertiary">{stage.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Features ───────────────────────────────────────────────────────────────

function Features() {
  return (
    <section id="features" className="px-6 py-24 scroll-mt-20">
      <div className="mx-auto max-w-7xl">
        <p className="font-[family-name:var(--font-display)] text-xs font-semibold uppercase tracking-widest text-accent">
          Features
        </p>

        {/* Hero feature: Client Portal */}
        <div className="mt-10 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl font-bold text-text-primary leading-tight">
              Your clients see status, not your inbox.
            </h2>
            <p className="mt-4 text-base text-text-secondary leading-relaxed max-w-lg">
              Clients get a magic-link portal. They check episode progress, approve
              deliverables, leave revision notes. No passwords, no training, no
              &ldquo;can you send me an update?&rdquo; emails.
            </p>
          </div>
          {/* Portal mockup */}
          <div className="rounded-xl border border-border-subtle bg-surface-raised p-5" aria-hidden="true">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs text-text-tertiary font-[family-name:var(--font-display)]">Client Portal — Acme Media</span>
              <span className="rounded-full bg-success/10 text-success px-2.5 py-0.5 text-[10px] font-medium">2 pending</span>
            </div>
            <div className="space-y-2">
              {[
                { title: 'EP 14 Rough Cut', status: 'Awaiting Review', statusColor: 'text-warning' },
                { title: 'EP 13 Final Mix', status: 'Approved', statusColor: 'text-success' },
                { title: 'EP 12 Show Notes', status: 'Awaiting Review', statusColor: 'text-warning' },
              ].map((d) => (
                <div key={d.title} className="flex items-center justify-between rounded-lg bg-surface-overlay px-4 py-3">
                  <span className="text-xs text-text-primary">{d.title}</span>
                  <span className={`text-[10px] font-medium ${d.statusColor}`}>{d.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Secondary features grid */}
        <div className="mt-16 grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-border-subtle rounded-xl overflow-hidden">
          {[
            {
              title: 'Integrations',
              desc: 'Frame.io, Google Drive, Vimeo, Transistor.fm. Review, deliver, and publish without switching tabs.',
              icon: IntegrationsIcon,
            },
            {
              title: 'Calendar',
              desc: 'Every episode across every show on one calendar. Week and month views, per-show filtering.',
              icon: CalendarIcon,
            },
            {
              title: 'Webhooks & API',
              desc: 'Signed payloads on every status change. Full REST API with key auth. Connect n8n, Zapier, or your own scripts.',
              icon: ApiIcon,
            },
            {
              title: 'AI-Ready',
              desc: 'MCP server lets Claude or any AI assistant manage your episodes, check dashboards, and create clients.',
              icon: McpIcon,
            },
          ].map((f) => (
            <div key={f.title} className="bg-surface-raised p-6">
              <f.icon className="h-6 w-6 text-accent" />
              <h3 className="mt-3 font-[family-name:var(--font-display)] text-sm font-semibold text-text-primary">{f.title}</h3>
              <p className="mt-2 text-xs text-text-secondary leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Built By ───────────────────────────────────────────────────────────────

function BuiltBy() {
  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-3xl text-center">
        <p className="font-[family-name:var(--font-display)] text-xs font-semibold uppercase tracking-widest text-accent">
          Built by a producer
        </p>
        <p className="mt-4 text-lg text-text-secondary leading-relaxed">
          PreRoll exists because its creator needed it. Every feature was built to solve a
          real problem in a real production business, then generalized for other producers
          and agencies. It is dogfooded daily.
        </p>
      </div>
    </section>
  )
}

// ─── Pricing ────────────────────────────────────────────────────────────────

const TIERS: {
  name: string
  price: string
  period: string
  description: string
  features: (string | { label: string; soon: boolean })[]
  cta: string
  href: string
  highlighted: boolean
}[] = [
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
      { label: 'Multi-user access', soon: true },
      { label: 'White-label client portal', soon: true },
      { label: 'Reporting and analytics', soon: true },
      { label: 'SSO / SAML', soon: true },
      'Priority support',
    ],
    cta: 'Contact Us',
    href: 'mailto:trevor@preroll.io',
    highlighted: false,
  },
]

function Pricing() {
  return (
    <section id="pricing" className="px-6 py-24 scroll-mt-20">
      <div className="mx-auto max-w-5xl">
        <p className="text-center font-[family-name:var(--font-display)] text-xs font-semibold uppercase tracking-widest text-accent">
          Pricing
        </p>
        <h2 className="mt-3 text-center font-[family-name:var(--font-display)] text-3xl sm:text-4xl font-bold text-text-primary">
          Simple, honest pricing.
        </h2>
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-5">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`rounded-xl border p-6 flex flex-col ${
                tier.highlighted
                  ? 'border-accent bg-surface-raised ring-1 ring-accent/20'
                  : 'border-border-subtle bg-surface-raised'
              }`}
            >
              <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold text-text-primary">{tier.name}</h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="font-[family-name:var(--font-display)] text-3xl font-bold text-text-primary">{tier.price}</span>
                {tier.period && <span className="text-sm text-text-tertiary">{tier.period}</span>}
              </div>
              <p className="mt-2 text-sm text-text-secondary">{tier.description}</p>
              <ul className="mt-6 space-y-2.5 flex-1">
                {tier.features.map((feature) => {
                  const isSoon = typeof feature === 'object'
                  const label = isSoon ? feature.label : feature
                  return (
                    <li key={label} className="flex items-start gap-2 text-sm">
                      <CheckIcon className="h-4 w-4 mt-0.5 shrink-0 text-success" />
                      <span className="text-text-secondary">
                        {label}
                        {isSoon && (
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

// ─── Final CTA ──────────────────────────────────────────────────────────────

function FinalCta() {
  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-7xl rounded-2xl bg-accent/5 border border-accent/10 p-12 sm:p-16 text-center">
        <h2 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-bold text-text-primary">
          Your next episode is waiting.
        </h2>
        <p className="mt-3 text-base text-text-secondary">
          Free tier. No credit card. One client, one show. See if it fits.
        </p>
        <Link
          href="/signup"
          className="mt-8 inline-block rounded-lg bg-accent px-8 py-3.5 text-sm font-semibold text-white hover:bg-accent-hover transition-colors"
        >
          Start Free
        </Link>
      </div>
    </section>
  )
}

// ─── Footer ─────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="border-t border-border-subtle px-6 py-12">
      <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-start justify-between gap-8">
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
              <li><Link href="/app/docs/api-keys" className="text-sm text-text-secondary hover:text-text-primary transition-colors">API</Link></li>
              <li><Link href="/app/docs/mcp" className="text-sm text-text-secondary hover:text-text-primary transition-colors">MCP Server</Link></li>
              <li><Link href="/app/docs/webhooks" className="text-sm text-text-secondary hover:text-text-primary transition-colors">Webhooks</Link></li>
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

// ─── Icons ──────────────────────────────────────────────────────────────────

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

import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PricingSection from '@/components/landing/pricing-section'

export default async function LandingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/app')

  return (
    <div className="min-h-screen bg-surface-base">
      <Nav />
      <Hero />
      <ApiFirst />
      <McpSection />
      <Integrations />
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
          PREROLL.IO
        </Link>
        <nav className="hidden sm:flex items-center gap-6">
          <a href="#features" className="text-sm text-text-tertiary hover:text-text-primary transition-colors">Features</a>
          <a href="#pricing" className="text-sm text-text-tertiary hover:text-text-primary transition-colors">Pricing</a>
          <Link href="/docs" className="text-sm text-text-tertiary hover:text-text-primary transition-colors">Docs</Link>
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
    <section className="relative pt-32 pb-24 px-6 overflow-hidden">
      <div className="mx-auto max-w-7xl grid lg:grid-cols-[1fr_1.1fr] gap-12 lg:gap-16 items-center">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl lg:text-[3.5rem] font-bold tracking-tight text-text-primary leading-[1.08]">
            Your podcast pipeline, programmable.
          </h1>
          <p className="mt-6 text-lg text-text-secondary leading-relaxed max-w-xl">
            API-first episode management for producers and agencies.
            Track, review, approve, and publish from the UI, the API,
            or your AI assistant.
          </p>
          <div className="mt-8 flex items-center gap-4">
            <Link
              href="/signup"
              className="rounded-lg bg-accent px-7 py-3 text-sm font-semibold text-white hover:bg-accent-hover transition-colors"
            >
              Start Free
            </Link>
            <Link
              href="/docs/developer/api-reference"
              className="text-sm font-medium text-text-tertiary hover:text-text-primary transition-colors"
            >
              View API Docs &rarr;
            </Link>
          </div>
        </div>

        <div className="relative hidden lg:block" aria-hidden="true">
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
          <div className="absolute -inset-10 -z-10 rounded-3xl bg-accent/5 blur-3xl" />
        </div>
      </div>
    </section>
  )
}

// ─── API-First ─────────────────────────────────────────────────────────────

function ApiFirst() {
  return (
    <section id="features" className="px-6 py-20 scroll-mt-20 bg-surface-raised/40">
      <div className="mx-auto max-w-7xl grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl font-bold text-text-primary leading-tight">
            Every action is an API call.
          </h2>
          <p className="mt-4 text-base text-text-secondary leading-relaxed max-w-lg">
            The UI is a client. So is your script. So is your AI assistant.
            preroll.io exposes a complete REST API: episodes, clients, approvals,
            publishing. Everything you can do in the dashboard, you can do in code.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-3">
            {[
              { name: 'Episodes', desc: 'Create, update, move through pipeline' },
              { name: 'Clients', desc: 'Manage contacts and shows' },
              { name: 'Shows', desc: 'Configure stages and templates' },
              { name: 'Webhooks', desc: 'Subscribe to pipeline events' },
            ].map((ep) => (
              <div key={ep.name} className="rounded-lg border border-border-subtle bg-surface-base px-4 py-3">
                <span className="font-mono text-xs text-accent">/api/v1/{ep.name.toLowerCase()}</span>
                <p className="mt-1 text-xs text-text-tertiary">{ep.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border-subtle bg-surface-base p-5 shadow-xl shadow-black/20" aria-hidden="true">
          <div className="flex items-center gap-2 mb-4">
            <span className="h-2.5 w-2.5 rounded-full bg-text-tertiary/30" />
            <span className="h-2.5 w-2.5 rounded-full bg-text-tertiary/30" />
            <span className="h-2.5 w-2.5 rounded-full bg-text-tertiary/30" />
            <span className="ml-3 text-xs text-text-tertiary font-[family-name:var(--font-display)]">Terminal</span>
          </div>
          <div className="font-mono text-sm leading-relaxed">
            <div className="text-text-tertiary">
              <span className="text-text-secondary">$</span>{' '}
              <span className="text-accent">curl</span>{' '}
              <span className="text-text-secondary">https://api.preroll.io/episodes \</span>
            </div>
            <div className="text-text-secondary pl-4">
              {'-d \'{"show": "The Basecamp Podcast",'}
            </div>
            <div className="text-text-secondary pl-8">
              {'"title": "Episode 14",'}
            </div>
            <div className="text-text-secondary pl-8">
              {'"stage": "editing"}\''}
            </div>
            <div className="mt-4 rounded-lg bg-surface-overlay px-4 py-3 text-xs text-text-tertiary">
              <span className="text-success">{'{ "ok": true }'}</span>
            </div>
          </div>
          <p className="mt-4 border-t border-border-subtle pt-4 text-sm text-text-secondary">
            Three lines. Episode created. Pipeline updated. Clients notified.
          </p>
        </div>
      </div>
    </section>
  )
}

// ─── MCP / AI Assistant ────────────────────────────────────────────────────

function McpSection() {
  return (
    <section className="px-6 py-28">
      <div className="mx-auto max-w-7xl grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        <div className="rounded-xl border border-accent/10 bg-surface-raised p-6 shadow-xl shadow-black/20 order-2 lg:order-1" aria-hidden="true">
          <div className="flex items-center gap-2 mb-5">
            <div className="h-5 w-5 rounded bg-accent/15 flex items-center justify-center">
              <svg className="h-3 w-3 text-accent" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 0 1 1.037-.443 48.282 48.282 0 0 0 5.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
              </svg>
            </div>
            <span className="text-xs text-text-tertiary font-[family-name:var(--font-display)]">Claude &middot; preroll.io MCP</span>
          </div>
          <div className="space-y-3">
            <div className="flex justify-end">
              <div className="rounded-lg bg-accent/10 px-4 py-2.5 max-w-[80%]">
                <p className="text-sm text-text-primary">What episodes are in review for the Basecamp show?</p>
              </div>
            </div>
            <div className="flex justify-start">
              <div className="rounded-lg bg-surface-overlay px-4 py-2.5 max-w-[85%]">
                <p className="text-sm text-text-secondary leading-relaxed">
                  Two episodes in review: Ep 14 &ldquo;Scaling Teams&rdquo; (waiting on client approval since Tuesday)
                  and Ep 15 &ldquo;Hiring Right&rdquo; (uploaded today).
                </p>
              </div>
            </div>
            <div className="flex justify-end">
              <div className="rounded-lg bg-accent/10 px-4 py-2.5 max-w-[80%]">
                <p className="text-sm text-text-primary">Move Ep 14 to approved and notify the client.</p>
              </div>
            </div>
            <div className="flex justify-start">
              <div className="rounded-lg bg-surface-overlay px-4 py-2.5 max-w-[85%]">
                <p className="text-sm text-text-secondary leading-relaxed">
                  Done. Ep 14 moved to Approved. Client notification sent.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="order-1 lg:order-2">
          <h2 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl font-bold text-text-primary leading-tight">
            Your AI assistant runs the pipeline.
          </h2>
          <p className="mt-4 text-base text-text-secondary leading-relaxed max-w-lg">
            preroll.io ships an MCP server. Connect it to Claude, ChatGPT, or any AI
            assistant and manage your production pipeline in natural language.
          </p>
          <p className="mt-6 text-sm text-text-tertiary max-w-lg">
            No tab-switching. No searching Slack threads. Just ask.
          </p>
          <div className="mt-6">
            <Link
              href="/docs/developer/mcp-server"
              className="text-sm font-medium text-accent hover:text-accent-hover transition-colors"
            >
              MCP setup guide &rarr;
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Integrations ──────────────────────────────────────────────────────────

function Integrations() {
  return (
    <section className="px-6 py-20 bg-surface-raised/40">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-2xl">
          <h2 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl font-bold text-text-primary leading-tight">
            Webhooks in. Webhooks out.
          </h2>
          <p className="mt-4 text-base text-text-secondary leading-relaxed">
            Push episode updates to your automation tools. Pull status changes from your
            review and publishing platforms. Every event is signed, logged, and retryable.
          </p>
        </div>

        <div className="mt-10 grid sm:grid-cols-2 gap-5 max-w-2xl">
          <div className="rounded-xl border border-border-subtle bg-surface-base p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center">
                <svg className="h-4 w-4 text-accent" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                </svg>
              </div>
              <h3 className="font-[family-name:var(--font-display)] text-sm font-semibold text-text-primary">Frame.io</h3>
            </div>
            <p className="text-sm text-text-secondary leading-relaxed">
              Sync review comments and approval status. Timecoded feedback flows directly into your episode timeline.
            </p>
          </div>
          <div className="rounded-xl border border-border-subtle bg-surface-base p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center">
                <svg className="h-4 w-4 text-accent" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 7.5l16.5-4.125M12 6.75c-2.708 0-5.363.224-7.948.655C2.999 7.58 2.25 8.507 2.25 9.574v9.176A2.25 2.25 0 004.5 21h15a2.25 2.25 0 002.25-2.25V9.574c0-1.067-.75-1.994-1.802-2.169A48.329 48.329 0 0012 6.75z" />
                </svg>
              </div>
              <h3 className="font-[family-name:var(--font-display)] text-sm font-semibold text-text-primary">Transistor.fm</h3>
            </div>
            <p className="text-sm text-text-secondary leading-relaxed">
              Publish episodes directly from the pipeline. Upload, set metadata, and go live without leaving preroll.io.
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-6">
          <p className="text-sm text-text-tertiary">
            Also: Google Drive, Vimeo, n8n, Zapier.
          </p>
          <Link href="/docs" className="text-sm text-accent hover:text-accent-hover transition-colors">
            See all integrations &rarr;
          </Link>
        </div>
      </div>
    </section>
  )
}

// ─── Built By ──────────────────────────────────────────────────────────────

function BuiltBy() {
  return (
    <section className="px-6 py-16">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-bold text-text-primary leading-tight">
          Built by a producer, for producers.
        </h2>
        <p className="mt-4 text-base text-text-secondary leading-relaxed">
          preroll.io isn&apos;t a project management tool with podcast features bolted on.
          It&apos;s built by someone who manages client shows every week and got tired
          of the spreadsheet.
        </p>
      </div>
    </section>
  )
}

// ─── Pricing ───────────────────────────────────────────────────────────────

function Pricing() {
  return <PricingSection />
}

// ─── Final CTA ─────────────────────────────────────────────────────────────

function FinalCta() {
  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-3xl rounded-2xl bg-accent/5 border border-accent/10 px-8 py-14 sm:px-16 text-center">
        <h2 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-bold text-text-primary">
          Your pipeline should be programmable.
        </h2>
        <p className="mt-3 text-base text-text-secondary">
          Start free. No credit card required.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/signup"
            className="rounded-lg bg-accent px-8 py-3.5 text-sm font-semibold text-white hover:bg-accent-hover transition-colors"
          >
            Start Free
          </Link>
          <Link
            href="/docs/developer/api-reference"
            className="text-sm font-medium text-text-tertiary hover:text-text-primary transition-colors"
          >
            Read the API Docs &rarr;
          </Link>
        </div>
      </div>
    </section>
  )
}

// ─── Footer ────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="border-t border-border-subtle px-6 py-12">
      <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-start justify-between gap-8">
        <div className="grid grid-cols-3 gap-8 sm:gap-12">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-text-tertiary">Product</p>
            <ul className="mt-3 space-y-2">
              <li><a href="#features" className="text-sm text-text-secondary hover:text-text-primary transition-colors">Features</a></li>
              <li><a href="#pricing" className="text-sm text-text-secondary hover:text-text-primary transition-colors">Pricing</a></li>
              <li><Link href="/docs" className="text-sm text-text-secondary hover:text-text-primary transition-colors">Docs</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-text-tertiary">Developers</p>
            <ul className="mt-3 space-y-2">
              <li><Link href="/docs/developer/api-reference" className="text-sm text-text-secondary hover:text-text-primary transition-colors">API</Link></li>
              <li><Link href="/docs/developer/mcp-server" className="text-sm text-text-secondary hover:text-text-primary transition-colors">MCP Server</Link></li>
              <li><Link href="/docs/developer/webhooks" className="text-sm text-text-secondary hover:text-text-primary transition-colors">Webhooks</Link></li>
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
        <p className="text-xs text-text-tertiary">&copy; {new Date().getFullYear()} preroll.io</p>
      </div>
    </footer>
  )
}

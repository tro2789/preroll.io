import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PricingSection from '@/components/landing/pricing-section'
import { FeatureBeats } from '@/components/landing/feature-beats'
import { IntegrationMarquee } from '@/components/landing/integration-marquee'
import { FaqSection } from '@/components/landing/faq-section'
import { AuroraBackground, CursorGlow, ScrollRevealInit, NavScrollEffect } from '@/components/landing/hero-effects'

export default async function LandingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/app')

  return (
    <div className="min-h-screen bg-surface-base overflow-x-hidden">
      <ScrollRevealInit />
      <NavScrollEffect />
      <CursorGlow />
      <Nav />
      <Hero />
      <FeatureBeats />
      <IntegrationMarquee />
      <PricingBlock />
      <div className="max-w-[1200px] mx-auto px-7"><div className="h-px bg-gradient-to-r from-transparent via-border-default to-transparent" /></div>
      <FaqSection />
      <FinalCta />
      <Footer />
    </div>
  )
}

// ─── Nav ────────────────────────────────────────────────────────────────────

function Nav() {
  return (
    <nav id="landing-nav" className="fixed top-0 left-0 right-0 z-[100] border-b border-transparent transition-all duration-[250ms]">
      <div className="flex items-center gap-7 h-[60px] max-w-[1200px] mx-auto px-7">
        <Link href="/" className="flex items-center gap-2.5 font-[family-name:var(--font-display)] font-bold text-[16.5px] tracking-[-0.02em]">
          <span className="w-[26px] h-[26px] rounded-[7px] grid place-items-center text-sm font-bold shadow-[0_4px_14px_-4px_oklch(0.715_0.155_40/0.6)]" style={{ background: 'linear-gradient(150deg, var(--color-accent), oklch(0.62 0.16 18))', color: 'white' }}>
            <svg className="w-[15px] h-[15px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
              <path d="M5 4v16M12 4v16M19 4v16" />
              <circle cx="12" cy="9" r="2.4" fill="currentColor" stroke="none" />
            </svg>
          </span>
          <span className="text-text-primary">PreRoll<span className="text-accent">.io</span></span>
        </Link>

        <div className="hidden lg:flex gap-1 ml-2">
          {[
            ['Product', '#features'],
            ['API & MCP', '#developers'],
            ['Integrations', '#integrations'],
            ['Pricing', '#pricing'],
            ['FAQ', '#faq'],
            ['Docs', '/docs'],
          ].map(([label, href]) => (
            <a key={label} href={href} className="px-[11px] py-[7px] rounded-[6px] text-sm text-text-secondary font-[450] hover:text-text-primary hover:bg-surface-raised transition-colors">
              {label}
            </a>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Link href="/login" className="text-sm text-text-secondary px-3 py-2 rounded-[6px] hover:text-text-primary transition-colors">
            Sign in
          </Link>
          <Link href="/signup" className="inline-flex items-center gap-2 px-4 py-2 rounded-[7px] text-sm font-semibold bg-accent text-white hover:bg-accent-hover transition-colors shadow-[0_0_0_0_var(--color-accent-tint),0_8px_24px_-8px_oklch(0.715_0.155_40/0.55)] hover:shadow-[0_0_0_4px_var(--color-accent-tint),0_12px_32px_-8px_oklch(0.715_0.155_40/0.65)]">
            Start free trial
          </Link>
        </div>
      </div>
    </nav>
  )
}

// ─── Hero ───────────────────────────────────────────────────────────────────

const STAGES = [
  { id: 'submitted', name: 'Submitted', color: 'var(--color-status-submitted)' },
  { id: 'editing', name: 'Editing', color: 'var(--color-status-editing)' },
  { id: 'review', name: 'Review', color: 'var(--color-status-review)' },
  { id: 'approved', name: 'Approved', color: 'var(--color-status-approved)' },
]

const TAG_COLORS = ['oklch(0.7 0.16 28)', 'oklch(0.7 0.15 200)', 'oklch(0.74 0.14 145)', 'oklch(0.72 0.14 300)']

const EPISODES = [
  { st: 'planning', no: 51, t: 'The cold open is a contract', sh: 'The Long Game', dt: 'Jun 02', tg: 0 },
  { st: 'planning', no: 24, t: "Sponsorship reads that don't tank retention", sh: 'Frequency', dt: 'Jun 09', tg: 1 },
  { st: 'recording', no: 50, t: 'What a 4-host roundtable costs you', sh: 'The Long Game', dt: 'May 26', tg: 0, dur: '52:40' },
  { st: 'recording', no: 23, t: 'Field recording without the wind problem', sh: 'Frequency', dt: 'May 22', tg: 1, dur: '38:11' },
  { st: 'recording', no: 12, t: 'Migrating a back-catalog without breaking feeds', sh: 'Build Log', dt: 'May 24', tg: 3, dur: '41:55' },
  { st: 'editing', no: 47, t: 'Why your retention curve lies to you', sh: 'The Long Game', dt: 'May 19', tg: 0, dur: '44:18' },
  { st: 'editing', no: 39, t: 'On-mic apologies & other trust mechanics', sh: 'Off the Record', dt: 'May 20', tg: 2, dur: '33:02' },
  { st: 'review', no: 46, t: 'The chart that fooled everyone', sh: 'The Long Game', dt: 'May 16', tg: 0, dur: '47:09' },
  { st: 'review', no: 38, t: "A producer's field guide to feedback", sh: 'Off the Record', dt: 'May 15', tg: 2, dur: '40:30' },
  { st: 'approved', no: 45, t: 'Reading a cliff vs. a slope', sh: 'The Long Game', dt: 'May 12', tg: 0, dur: '45:55' },
  { st: 'approved', no: 21, t: 'Cold opens, A/B tested', sh: 'Frequency', dt: 'May 12', tg: 1, dur: '31:20' },
]

function Hero() {
  return (
    <header className="relative pt-[132px] pb-[70px] overflow-hidden">
      <AuroraBackground />
      <div className="absolute left-0 right-0 bottom-0 h-[220px] bg-gradient-to-b from-transparent to-surface-base z-[1]" />

      <div className="relative z-[2] text-center max-w-[1200px] mx-auto px-7">
        <h1
          className="reveal in font-[family-name:var(--font-display)] font-semibold text-[clamp(38px,5.6vw,67px)] max-w-[17ch] mx-auto mt-5 leading-[1.12] tracking-[-0.022em]"
          data-d="1"
          style={{
            background: 'linear-gradient(180deg, oklch(0.99 0.003 264), oklch(0.78 0.01 264))',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
          }}
        >
          Production management your AI can actually run.
        </h1>
        <p className="reveal in text-[clamp(16px,1.5vw,19px)] text-text-secondary max-w-[60ch] mx-auto mt-5 leading-relaxed" data-d="2">
          PreRoll.io is the AI-native production tool for podcast agencies. It ships with a full REST API and a built-in MCP server, so Claude, your own agents, or a five-line script can read the pipeline, move episodes, pull transcripts, and publish.
        </p>
        <div className="reveal in flex gap-3 justify-center mt-7 flex-wrap" data-d="3">
          <Link href="/signup" className="inline-flex items-center gap-2 px-6 py-[13px] rounded-[9px] text-[15.5px] font-semibold bg-accent text-white hover:bg-accent-hover transition-colors shadow-[0_0_0_0_var(--color-accent-tint),0_8px_24px_-8px_oklch(0.715_0.155_40/0.55)] hover:shadow-[0_0_0_4px_var(--color-accent-tint),0_12px_32px_-8px_oklch(0.715_0.155_40/0.65)]">
            Start free trial
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </Link>
          <a href="#developers" className="inline-flex items-center gap-2 px-6 py-[13px] rounded-[9px] text-[15.5px] font-medium border border-border-default bg-surface-raised text-text-primary hover:bg-surface-overlay hover:border-border-strong transition-colors">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M8 5v14l11-7z" /></svg>
            See the API & MCP server
          </a>
        </div>
        <p className="reveal in mt-4 text-[13px] text-fg-faint" data-d="4">
          Free 7-day trial · no card required · <span className="font-mono text-text-tertiary">REST API · built-in MCP server · Frame.io & host integrations</span>
        </p>
      </div>

      {/* Kanban product shot */}
      <div className="max-w-[1080px] mx-auto px-7 mt-14">
        <div className="relative z-[2]">
          <div className="shot-aura" aria-hidden="true" />
          <div className="relative border border-border-default rounded-[20px] bg-bg-deeper overflow-hidden shadow-[0_1px_0_oklch(1_0_0/0.04)_inset,0_40px_120px_-40px_oklch(0.05_0_0/0.8),0_0_0_1px_oklch(0_0_0/0.3)] reveal" data-d="3">
            <div className="flex items-center gap-2.5 px-4 py-[11px] border-b border-border-subtle bg-[oklch(0.155_0.006_264)]">
              <span className="flex gap-1.5">
                <i className="block w-2.5 h-2.5 rounded-full bg-surface-3" />
                <i className="block w-2.5 h-2.5 rounded-full bg-surface-3" />
                <i className="block w-2.5 h-2.5 rounded-full bg-surface-3" />
              </span>
              <span className="text-[12.5px] text-text-tertiary flex items-center gap-1.5 ml-1.5">
                Atlas Audio Co. <span className="text-fg-faint">/</span> <b className="text-text-secondary font-medium">Dashboard</b>
              </span>
              <span className="ml-auto flex items-center gap-1.5 text-[11.5px] text-text-tertiary font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-success shadow-[0_0_0_0_oklch(0.74_0.14_165/0.6)] animate-[blip_2.4s_ease-out_infinite]" />
                live pipeline
              </span>
            </div>
            <div className="p-4 grid grid-cols-5 gap-3 min-h-[332px] max-[920px]:grid-cols-3 max-[560px]:grid-cols-2">
              {STAGES.map((stage) => {
                const cards = EPISODES.filter(ep => ep.st === stage.id)
                return (
                  <div key={stage.id} className="min-w-0 max-[920px]:[&:nth-child(n+4)]:hidden max-[560px]:[&:nth-child(n+3)]:hidden">
                    <div className="flex items-center gap-1.5 px-1 pb-2.5 text-[11.5px]">
                      <span className="w-[7px] h-[7px] rounded-full shrink-0" style={{ background: stage.color }} />
                      <span className="font-semibold text-text-primary">{stage.name}</span>
                      <span className="font-mono text-[10.5px] text-fg-faint ml-auto">{cards.length}</span>
                    </div>
                    <div className="flex flex-col gap-2.5">
                      {cards.map(ep => (
                        <div key={ep.no} className="bg-surface-raised border border-border-subtle rounded-[9px] p-2.5 hover:border-border-strong transition-colors">
                          <div className="aspect-video rounded bg-gradient-to-br from-surface-overlay to-surface-3 relative overflow-hidden mb-2">
                            <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_80%_0%,oklch(0.5_0.06_264/0.45),transparent)]" />
                            <span className="absolute top-[5px] left-[7px] font-mono text-[9px] text-text-secondary">EP {String(ep.no).padStart(3, '0')}</span>
                            {ep.dur && <span className="absolute bottom-1 right-[5px] font-mono text-[8.5px] bg-[oklch(0.1_0_0/0.7)] px-1 py-0.5 rounded-[3px] text-text-primary">{ep.dur}</span>}
                          </div>
                          <div className="text-[11.5px] font-medium text-text-primary leading-[1.32]">{ep.t}</div>
                          <div className="text-[10px] text-text-tertiary mt-0.5">{ep.sh}</div>
                          <div className="flex items-center gap-[5px] mt-2">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: TAG_COLORS[ep.tg] }} />
                            <span className="ml-auto font-mono text-[9.5px] text-text-tertiary">{ep.dt}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

// ─── Pricing ───────────────────────────────────────────────────────────────

function PricingBlock() {
  return (
    <section id="pricing" className="py-24 px-7 max-w-[1200px] mx-auto">
      <div className="text-center max-w-[64ch] mx-auto reveal">
        <span className="font-mono text-xs tracking-[0.12em] uppercase text-accent">Pricing</span>
        <h2 className="font-[family-name:var(--font-display)] text-[clamp(28px,3.4vw,40px)] font-semibold text-text-primary leading-[1.12] tracking-[-0.022em] mt-3.5">Priced per studio, not per headache</h2>
        <p className="text-text-secondary mt-4 text-[17px] leading-relaxed">Start free for 7 days. No card required. Cancel anytime.</p>
      </div>
      <div className="mt-12">
        <PricingSection />
      </div>
    </section>
  )
}

// ─── Final CTA ─────────────────────────────────────────────────────────────

function FinalCta() {
  return (
    <section className="relative overflow-hidden py-[108px]">
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="aurora aurora-1" style={{ left: '10%', top: '-180px' }} />
        <div className="aurora aurora-2" style={{ right: '8%', top: '-120px' }} />
      </div>
      <div className="max-w-[1200px] mx-auto px-7">
        <div className="reveal relative z-[2] max-w-[760px] mx-auto p-14 sm:px-10 border border-border-default rounded-[20px] bg-[oklch(0.155_0.006_264/0.7)] backdrop-blur-lg shadow-[0_40px_120px_-40px_oklch(0.05_0_0/0.8)] text-center">
          <h2 className="font-[family-name:var(--font-display)] text-[clamp(28px,3.8vw,42px)] font-semibold text-text-primary leading-[1.12] tracking-[-0.022em]">
            Stop running production from a spreadsheet
          </h2>
          <p className="text-text-secondary mt-4 text-[17px]">
            Bring every show, every client, and every deliverable into one pipeline, and let the writing draft itself. Free for 7 days.
          </p>
          <div className="flex gap-3 justify-center mt-7 flex-wrap">
            <Link href="/signup" className="inline-flex items-center gap-2 px-6 py-3 rounded-[9px] text-[15.5px] font-semibold bg-accent text-white hover:bg-accent-hover transition-colors shadow-[0_0_0_0_var(--color-accent-tint),0_8px_24px_-8px_oklch(0.715_0.155_40/0.55)]">
              Start free trial
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </Link>
            <Link href="/signup" className="inline-flex items-center gap-2 px-6 py-3 rounded-[9px] text-[15.5px] font-medium border border-border-default bg-surface-raised text-text-primary hover:bg-surface-overlay transition-colors">
              Book a walkthrough
            </Link>
          </div>
          <p className="mt-3.5 text-[13px] text-fg-faint">No card required · cancel anytime · <span className="font-mono text-text-tertiary">setup in an afternoon</span></p>
        </div>
      </div>
    </section>
  )
}

// ─── Footer ────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="border-t border-border-subtle bg-bg-deeper py-14 px-7">
      <div className="max-w-[1200px] mx-auto">
        <div className="grid grid-cols-[1.6fr_repeat(3,1fr)] gap-10 max-[760px]:grid-cols-2 max-[760px]:gap-7">
          <div className="max-[760px]:col-span-2">
            <Link href="/" className="flex items-center gap-2.5 font-[family-name:var(--font-display)] font-bold text-[16.5px] tracking-[-0.02em] mb-3.5">
              <span className="w-[26px] h-[26px] rounded-[7px] grid place-items-center text-sm font-bold shadow-[0_4px_14px_-4px_oklch(0.715_0.155_40/0.6)]" style={{ background: 'linear-gradient(150deg, var(--color-accent), oklch(0.62 0.16 18))', color: 'white' }}>
                <svg className="w-[15px] h-[15px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
                  <path d="M5 4v16M12 4v16M19 4v16" />
                  <circle cx="12" cy="9" r="2.4" fill="currentColor" stroke="none" />
                </svg>
              </span>
              <span className="text-text-primary">PreRoll<span className="text-accent">.io</span></span>
            </Link>
            <p className="text-[13.5px] text-text-tertiary max-w-[36ch] leading-relaxed">
              AI-native production management for podcast agencies. Built by people who&apos;ve missed too many publish dates.
            </p>
          </div>

          {[
            { title: 'Product', links: [['Pipeline', '#features'], ['AI assist', '#features'], ['Client portal', '#features'], ['Integrations', '#integrations'], ['Pricing', '#pricing']] },
            { title: 'Company', links: [['About', '#'], ['Blog', '#'], ['Contact', '#']] },
            { title: 'Resources', links: [['Docs', '/docs'], ['Changelog', '#'], ['Privacy', '#'], ['Terms', '#']] },
          ].map(col => (
            <div key={col.title}>
              <h4 className="text-xs font-semibold tracking-[0.06em] uppercase text-fg-faint mb-3.5">{col.title}</h4>
              {col.links.map(([label, href]) => (
                <a key={label} href={href} className="block text-[13.5px] text-text-secondary py-[5px] hover:text-text-primary transition-colors">{label}</a>
              ))}
            </div>
          ))}
        </div>

        <div className="mt-11 pt-5 border-t border-border-subtle flex items-center gap-4 text-[12.5px] text-fg-faint">
          <span>&copy; {new Date().getFullYear()} PreRoll.io. All rights reserved.</span>
          <span className="font-mono text-text-tertiary">made for podcast people</span>
        </div>
      </div>
    </footer>
  )
}

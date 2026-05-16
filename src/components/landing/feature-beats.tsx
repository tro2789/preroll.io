import Link from 'next/link'

function CheckIcon() {
  return (
    <svg className="w-[17px] h-[17px] shrink-0 mt-0.5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

function ArrowIcon() {
  return (
    <svg className="w-[15px] h-[15px] text-accent transition-transform group-hover:translate-x-[3px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}

function PanelShell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="relative border border-border-default rounded-[13px] bg-bg-deeper shadow-[0_30px_80px_-36px_oklch(0.05_0_0/0.7)] overflow-hidden">
      <div className="absolute -inset-px rounded-inherit pointer-events-none opacity-50" style={{ background: 'radial-gradient(60% 50% at 20% 0%, oklch(0.715 0.155 40 / 0.15), transparent 70%)' }} />
      <div className="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-border-subtle bg-[oklch(0.155_0.006_264)] relative z-10">
        <span className="flex gap-[5px]">
          <i className="block w-[9px] h-[9px] rounded-full bg-surface-3" />
          <i className="block w-[9px] h-[9px] rounded-full bg-surface-3" />
          <i className="block w-[9px] h-[9px] rounded-full bg-surface-3" />
        </span>
        <span className="text-xs text-text-tertiary font-mono ml-1">{label}</span>
      </div>
      <div className="p-4 relative z-10">{children}</div>
    </div>
  )
}

function Beat({ kicker, title, lead, items, linkText, linkHref, flipped, children }: {
  kicker: string
  title: string
  lead: string
  items: { bold: string; rest: string }[]
  linkText: string
  linkHref: string
  flipped?: boolean
  children: React.ReactNode
}) {
  return (
    <div className={`grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-[64px] items-center ${flipped ? '' : ''}`}>
      <div className={flipped ? 'lg:order-2' : ''}>
        <span className="font-mono text-xs tracking-[0.12em] uppercase text-accent">{kicker}</span>
        <h3 className="font-[family-name:var(--font-display)] text-[clamp(24px,2.6vw,31px)] font-semibold text-text-primary leading-[1.12] tracking-[-0.022em] mt-3">{title}</h3>
        <p className="text-text-secondary mt-3.5 text-[16.5px] leading-relaxed">{lead}</p>
        <ul className="mt-5 flex flex-col gap-[13px]">
          {items.map((item, i) => (
            <li key={i} className="flex gap-2.5 items-start text-[14.5px] text-text-secondary">
              <CheckIcon />
              <span><b className="text-text-primary font-semibold">{item.bold}</b> {item.rest}</span>
            </li>
          ))}
        </ul>
        <Link href={linkHref} className="group mt-6 inline-flex items-center gap-1.5 text-[14.5px] font-medium text-text-primary">
          {linkText} <ArrowIcon />
        </Link>
      </div>
      <div className={flipped ? 'lg:order-1' : ''}>{children}</div>
    </div>
  )
}

export function FeatureBeats() {
  return (
    <section id="features" className="py-24 px-7 max-w-[1200px] mx-auto">
      <div className="text-center max-w-[64ch] mx-auto reveal">
        <span className="font-mono text-xs tracking-[0.12em] uppercase text-accent">What it does</span>
        <h2 className="font-[family-name:var(--font-display)] text-[clamp(28px,3.4vw,40px)] font-semibold text-text-primary leading-[1.12] tracking-[-0.022em] mt-3.5">An AI-native tool, end to end</h2>
        <p className="text-text-secondary mt-4 text-[17px] leading-relaxed">The API and the MCP server are in the box on day one. So is an AI assistant that reads your pipeline and writes what you&apos;d normally type at 11pm.</p>
      </div>

      <div className="mt-[72px] space-y-28">
        {/* Beat 0 — API & MCP */}
        <div className="reveal" id="developers">
          <Beat
            kicker="The API & MCP server"
            title="An API and an MCP server, in the box"
            lead="PreRoll.io exposes everything the app does through a REST API, and ships a built-in MCP server so any MCP client uses it as tools. Point Claude at your workspace and it can list shows, advance an episode, fetch a transcript, draft notes, or publish."
            items={[
              { bold: 'Built-in MCP server.', rest: 'Nothing to host. Connect Claude or any agent and the pipeline shows up as callable tools.' },
              { bold: 'Full REST API.', rest: 'Everything in the UI has an endpoint, plus webhooks for every stage change, episode update, and approval.' },
              { bold: 'Scoped access and an audit log.', rest: 'An agent only ever sees the shows and actions you grant it, and every call is on the record.' },
            ]}
            linkText="Read the API docs"
            linkHref="/docs/developer/api-reference"
          >
            <PanelShell label="claude · preroll mcp">
              <div className="font-mono text-[11.5px] leading-[1.75] text-text-secondary">
                <span className="block text-fg-faint"># Claude, connected to the PreRoll MCP server</span>
                <span className="block"><span className="text-accent">▸</span> <span className="text-text-primary">&quot;Move EP 047 to Review and let Dana know it&apos;s ready.&quot;</span></span>
                <span className="block">&nbsp;</span>
                <span className="block"><span className="text-fg-faint">→</span> <span className="text-status-planning">preroll.episodes.advance</span></span>
                <span className="block pl-4"><span className="text-status-planning">episode</span>: <span className="text-status-editing">&quot;ep_047&quot;</span>  <span className="text-status-planning">to_stage</span>: <span className="text-status-editing">&quot;review&quot;</span></span>
                <span className="block"><span className="text-success">✓</span> EP 047 · &quot;Why your retention curve lies to you&quot; · Editing → Review</span>
                <span className="block">&nbsp;</span>
                <span className="block"><span className="text-fg-faint">→</span> <span className="text-status-planning">preroll.clients.notify</span></span>
                <span className="block pl-4"><span className="text-status-planning">client</span>: <span className="text-status-editing">&quot;reyes_media&quot;</span>  <span className="text-status-planning">template</span>: <span className="text-status-editing">&quot;ready_for_review&quot;</span></span>
                <span className="block"><span className="text-success">✓</span> review link sent to dana@reyesmedia.co</span>
                <span className="block">&nbsp;</span>
                <span className="block"><span className="text-accent">▸</span> <span className="text-text-primary">Done. EP 047 is in Review and Dana has the link.</span></span>
              </div>
            </PanelShell>
          </Beat>
        </div>

        {/* Beat 1 — AI Chat */}
        <div className="reveal">
          <Beat
            kicker="The AI assistant"
            title="Talk to your pipeline"
            lead="PreRoll AI lives in a sliding panel, reachable from any page with one keystroke. Ask it to look up episodes, check what&apos;s overdue, draft show notes from a transcript, or advance an episode. It confirms before making changes."
            items={[
              { bold: 'Context-aware.', rest: 'It knows which episode, show, or client you’re viewing and scopes answers automatically.' },
              { bold: '22 tools, read and write.', rest: 'Look things up, create episodes, generate content, move stages — all with confirmation before executing.' },
              { bold: 'Transcribe and draft.', rest: 'Upload audio and it auto-transcribes, then generates show notes, titles, and social posts.' },
            ]}
            linkText="Try the AI assistant"
            linkHref="/signup"
            flipped
          >
            <PanelShell label="AI Assistant">
              {/* Header */}
              <div className="flex items-center gap-2 pb-2.5 border-b border-border-subtle mb-3">
                <svg className="w-4 h-4 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
                  <path d="M5 19l1 3 1-3 3-1-3-1-1-3-1 3-3 1 3 1z" />
                </svg>
                <span className="text-[12.5px] font-semibold text-text-primary">AI Assistant</span>
                <span className="ml-auto text-[10px] text-fg-faint font-mono">{'⌘'}J</span>
              </div>

              {/* Context bar */}
              <div className="px-2.5 py-1.5 mb-3 rounded-md bg-surface-raised/50">
                <span className="text-[10.5px] text-text-secondary">Viewing: The Long Game &middot; EP 047</span>
              </div>

              {/* Messages */}
              <div className="space-y-2.5">
                {/* User message */}
                <div className="flex justify-end">
                  <div className="max-w-[85%] rounded-xl px-3 py-2 bg-[oklch(0.715_0.155_40/0.15)] text-[12px] text-text-primary leading-relaxed">
                    What&apos;s overdue this week? And move EP 047 to Review.
                  </div>
                </div>

                {/* Tool indicator */}
                <div className="flex items-center gap-2 text-[11px] text-text-secondary py-0.5">
                  <div className="w-3 h-3 border-2 border-accent/50 border-t-accent rounded-full animate-spin" />
                  <span>Checking episodes...</span>
                </div>

                {/* Assistant response */}
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-xl px-3 py-2 bg-surface-raised text-[12px] text-text-primary leading-relaxed">
                    <b className="font-semibold">2 episodes overdue:</b><br />
                    &bull; EP 046 &ldquo;The chart that fooled everyone&rdquo; &mdash; Review, due May 16<br />
                    &bull; EP 038 &ldquo;A producer&apos;s field guide&rdquo; &mdash; Review, due May 15
                  </div>
                </div>

                {/* Action card */}
                <div className="flex justify-start">
                  <div className="max-w-[85%]">
                    <div className="rounded-lg border border-border-subtle bg-surface-raised p-2.5">
                      <p className="text-[11.5px] text-text-primary font-medium mb-2">Move EP 047 &rarr; Review</p>
                      <div className="flex gap-1.5">
                        <span className="px-2.5 py-1 rounded-md bg-accent text-white text-[10.5px] font-medium">Confirm</span>
                        <span className="px-2.5 py-1 rounded-md border border-border-default bg-surface-overlay text-text-secondary text-[10.5px] font-medium">Cancel</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Credit bar */}
              <div className="mt-3.5 pt-2.5 border-t border-border-subtle flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[10.5px]">
                  <svg className="w-3 h-3 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                  </svg>
                  <span className="text-text-secondary">24 monthly &middot; 100 purchased</span>
                </div>
                <span className="text-[10.5px] text-text-tertiary">1 credit/turn</span>
              </div>

              {/* Input */}
              <div className="mt-2.5 flex items-center gap-2">
                <div className="flex-1 px-2.5 py-1.5 rounded-lg border border-border-subtle bg-surface-input text-[11px] text-text-tertiary">
                  Ask anything about your shows...
                </div>
                <div className="w-7 h-7 rounded-lg bg-accent/40 flex items-center justify-center shrink-0">
                  <svg className="w-3.5 h-3.5 text-white/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </PanelShell>
          </Beat>
        </div>
      </div>
    </section>
  )
}

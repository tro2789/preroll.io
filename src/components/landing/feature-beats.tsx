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
    <div className="relative border border-border-default rounded-[10px] bg-bg-deeper shadow-[0_30px_80px_-36px_oklch(0.05_0_0/0.7)] overflow-hidden">
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
    <div className={`grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center ${flipped ? '' : ''}`}>
      <div className={flipped ? 'lg:order-2' : ''}>
        <span className="font-mono text-xs tracking-[0.12em] uppercase text-accent">{kicker}</span>
        <h3 className="font-[family-name:var(--font-display)] text-2xl sm:text-[31px] font-semibold text-text-primary leading-[1.12] tracking-[-0.022em] mt-3">{title}</h3>
        <p className="text-text-secondary mt-3.5 text-[16.5px] leading-relaxed">{lead}</p>
        <ul className="mt-5 flex flex-col gap-3.5">
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
        <p className="text-text-secondary mt-4 text-[17px] leading-relaxed">The API and the MCP server are in the box on day one. So is everything they plug into: a shared production pipeline, AI-drafted titles and show notes, and a clean client portal that needs no logins.</p>
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

        {/* Beat 1 — Pipeline */}
        <div className="reveal">
          <Beat
            kicker="The pipeline"
            title="One board for everything in flight"
            lead="Every episode, every show, every client, on a single kanban organized by production stage. WIP limits flag bottlenecks before they turn into missed dates. Drag a card to advance it; filter to one client and the noise disappears."
            items={[
              { bold: 'Stages you define.', rest: 'Planning → Recording → Editing → Review → Approved, or whatever your shop actually runs.' },
              { bold: 'WIP limits and overdue flags', rest: 'so a stalled episode surfaces itself instead of hiding.' },
              { bold: 'Scope to a client or show', rest: 'in one click. Same board, less to scan.' },
            ]}
            linkText="See the dashboard"
            linkHref="/signup"
            flipped
          >
            <PanelShell label="dashboard · board view">
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { name: 'Recording', color: 'var(--color-status-recording)', wip: '3/3', cards: [
                    { t: 'What a 4-host roundtable costs you', s: 'The Long Game · EP 50', p: 30 },
                    { t: 'Field recording without the wind problem', s: 'Frequency · EP 23', p: 25 },
                  ]},
                  { name: 'Editing', color: 'var(--color-status-editing)', cards: [
                    { t: 'Why your retention curve lies to you', s: 'The Long Game · EP 47', p: 62 },
                    { t: 'On-mic apologies and trust mechanics', s: 'Off the Record · EP 39', p: 48 },
                  ]},
                  { name: 'Review', color: 'var(--color-status-review)', cards: [
                    { t: 'The chart that fooled everyone', s: 'The Long Game · EP 46', p: 88 },
                    { t: "A producer's field guide to feedback", s: 'Off the Record · EP 38', p: 80 },
                  ]},
                ].map(col => (
                  <div key={col.name}>
                    <div className="flex items-center gap-1.5 pb-2 px-0.5 text-[10.5px]">
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: col.color }} />
                      <span className="font-semibold text-text-secondary">{col.name}</span>
                      {col.wip && <span className="ml-auto font-mono text-[9px] text-warning">{col.wip}</span>}
                    </div>
                    {col.cards.map(card => (
                      <div key={card.t} className="bg-surface-raised border border-border-subtle rounded-[7px] p-2 px-2.5 mb-2">
                        <div className="text-[11px] font-medium text-text-primary leading-[1.3]">{card.t}</div>
                        <div className="text-[9.5px] text-text-tertiary mt-1">{card.s}</div>
                        <div className="h-[3px] rounded-full bg-surface-3 mt-1.5 overflow-hidden">
                          <div className="h-full bg-accent rounded-full" style={{ width: `${card.p}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </PanelShell>
          </Beat>
        </div>

        {/* Beat 2 — AI */}
        <div className="reveal">
          <Beat
            kicker="The AI"
            title="The busywork, drafted before you ask"
            lead="The moment a cut lands, PreRoll.io reads the audio and drafts what you'd otherwise write at 11pm: a ranked set of titles, full show notes, timestamped chapters, and a clean transcript. You edit, pick, and publish."
            items={[
              { bold: 'Ranked title options.', rest: 'Pick one, tweak it, or regenerate from a different angle.' },
              { bold: 'Show notes and chapters', rest: 'in your house style, ready to paste into your host.' },
              { bold: 'You stay in control.', rest: "Nothing publishes itself; every draft is yours to approve." },
            ]}
            linkText="Inside an episode"
            linkHref="/signup"
          >
            <PanelShell label="EP 047 · AI assist">
              <div className="flex items-center gap-2.5 pb-3 border-b border-border-subtle mb-3">
                <span className="w-7 h-7 rounded-[7px] grid place-items-center bg-accent-tint text-accent">
                  <svg className="w-[15px] h-[15px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
                    <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
                  </svg>
                </span>
                <div>
                  <div className="text-[12.5px] font-semibold text-text-primary">Generated titles</div>
                  <div className="text-[10px] text-fg-faint font-mono">claude · just now</div>
                </div>
              </div>
              {[
                { rank: '01', title: 'Why your retention curve lies to you', chosen: true },
                { rank: '02', title: "The retention metric that's quietly killing your show" },
                { rank: '03', title: 'What average listen-through hides from you' },
              ].map(opt => (
                <div key={opt.rank} className="flex items-center gap-2.5 px-2.5 py-2 rounded-[7px] hover:bg-surface-raised transition-colors">
                  <span className="font-mono text-[10px] text-fg-faint w-4">{opt.rank}</span>
                  <span className="flex-1 text-[12.5px] text-text-primary leading-[1.35]">{opt.title}</span>
                  {opt.chosen && (
                    <span className="text-[10px] font-semibold text-accent border border-accent-quiet bg-accent-tint px-1.5 py-0.5 rounded-full">Chosen</span>
                  )}
                </div>
              ))}
              <div className="mt-3.5 pt-3 border-t border-border-subtle text-[11.5px] text-text-tertiary leading-relaxed">
                <div className="text-[11px] font-semibold text-text-secondary mb-1">Show notes · 1,180 words · 5 chapters</div>
                <span className="font-mono text-fg-faint">00:00</span> Cold open: the chart that lies &middot; <span className="font-mono text-fg-faint">04:12</span> Why average listen-through is wrong &middot; <span className="font-mono text-fg-faint">17:38</span> Reading a cliff vs. a slope ...
              </div>
            </PanelShell>
          </Beat>
        </div>

        {/* Beat 3 — Client Portal */}
        <div className="reveal">
          <Beat
            kicker="The client side"
            title="Clients see exactly what they need, and nothing else"
            lead="Share a review link, not a folder. Clients open a clean page with the cut, the show notes, and the cover art. They leave feedback, approve, and they're done."
            items={[
              { bold: 'Free client portal.', rest: 'No seat required, no login maze, just the link.' },
              { bold: 'Per-deliverable status.', rest: 'Approved, Pending, or Revision requested, visible to everyone.' },
              { bold: 'Frame.io-connected,', rest: 'so the file you review is the file of record.' },
            ]}
            linkText="See the review flow"
            linkHref="/signup"
            flipped
          >
            <PanelShell label="reyesmedia.preroll.io · EP 047 review">
              <div className="-m-4">
                {[
                  { name: 'long-game-047_final-v3.mp4', meta: '1.4 GB · 44:18 · updated 2h ago', status: 'Approved', statusClass: 'text-success bg-[oklch(0.74_0.14_165/0.14)]' },
                  { name: 'EP047_show-notes.md', meta: '6 KB · drafted by AI · edited', status: 'Pending', statusClass: 'text-warning bg-[oklch(0.78_0.13_75/0.14)]' },
                  { name: 'EP047_cover-art.png', meta: '2.1 MB · 3000×3000', status: 'Revision', statusClass: 'text-error bg-[oklch(0.66_0.18_22/0.14)]' },
                ].map(item => (
                  <div key={item.name} className="flex items-center gap-3 px-3 py-2.5 border-b border-border-subtle">
                    <div className="w-[46px] h-[30px] rounded-[5px] bg-gradient-to-br from-surface-overlay to-surface-3 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-text-primary truncate">{item.name}</div>
                      <div className="text-[10px] text-text-tertiary mt-0.5 font-mono">{item.meta}</div>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${item.statusClass}`}>
                      {item.status}
                    </span>
                  </div>
                ))}
                <div className="flex items-center gap-2.5 px-3 py-2.5 text-[11px] text-text-tertiary">
                  <span className="flex items-center gap-1.5">
                    <span className="w-[18px] h-[18px] rounded-full bg-surface-3 grid place-items-center text-[8.5px] font-semibold text-text-secondary">DR</span>
                    Dana Reyes is reviewing
                  </span>
                  <span className="ml-auto text-[11px] font-semibold text-accent-fg bg-accent px-2.5 py-1 rounded-md">Approve all</span>
                </div>
              </div>
            </PanelShell>
          </Beat>
        </div>
      </div>
    </section>
  )
}

const INTEGRATIONS = [
  ['Frame.io', 'FR', 'oklch(0.78 0.13 95)'],
  ['Google Drive', 'GD', 'oklch(0.74 0.14 145)'],
  ['Vimeo', 'VM', 'oklch(0.68 0.16 280)'],
  ['Transistor.fm', 'TR', 'oklch(0.7 0.15 200)'],
  ['Deepgram', 'DG', 'oklch(0.74 0.16 150)'],
  ['Claude AI', 'CL', 'oklch(0.72 0.16 30)'],
  ['Stripe', 'ST', 'oklch(0.72 0.15 320)'],
  ['n8n', 'N8', 'oklch(0.74 0.15 50)'],
  ['Webhooks', 'WH', 'oklch(0.72 0.13 330)'],
  ['REST API', 'AP', 'oklch(0.7 0.14 264)'],
  ['MCP Server', 'MC', 'oklch(0.74 0.14 145)'],
  ['Cloudflare R2', 'R2', 'oklch(0.72 0.16 35)'],
] as const

function Chip({ name, abbr, color }: { name: string; abbr: string; color: string }) {
  return (
    <div className="flex items-center gap-2.5 px-4 py-2.5 border border-border-subtle bg-surface-raised rounded-[7px] text-sm font-medium text-text-secondary whitespace-nowrap hover:border-border-strong hover:text-text-primary hover:bg-surface-overlay transition-colors">
      <span
        className="w-[18px] h-[18px] rounded-[5px] grid place-items-center text-[9px] font-bold font-mono shrink-0"
        style={{ background: color, color: 'oklch(0.16 0.02 264)' }}
      >
        {abbr}
      </span>
      {name}
    </div>
  )
}

function MarqueeTrack({ items, reverse }: { items: (readonly [string, string, string])[]; reverse?: boolean }) {
  const doubled = [...items, ...items]
  return (
    <div className="relative overflow-hidden" style={{ maskImage: 'linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)' }}>
      <div
        className={`flex gap-3.5 w-max hover:[animation-play-state:paused] ${reverse ? 'animate-[scrollx_50s_linear_infinite_reverse]' : 'animate-[scrollx_50s_linear_infinite]'}`}
      >
        {doubled.map(([name, abbr, color], i) => (
          <Chip key={`${name}-${i}`} name={name} abbr={abbr} color={color} />
        ))}
      </div>
    </div>
  )
}

export function IntegrationMarquee() {
  const row1 = [...INTEGRATIONS, ...INTEGRATIONS]
  const row2 = [...INTEGRATIONS, ...INTEGRATIONS].reverse()

  return (
    <section id="integrations" className="py-[78px] border-t border-b border-border-subtle bg-bg-deeper">
      <div className="max-w-[1200px] mx-auto px-7 text-center text-sm text-text-tertiary mb-9 reveal">
        Connects to the tools you already use.
      </div>
      <div className="space-y-3.5">
        <MarqueeTrack items={[...row1]} />
        <MarqueeTrack items={[...row2]} reverse />
      </div>
    </section>
  )
}

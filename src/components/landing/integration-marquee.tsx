const INTEGRATIONS = [
  ['Frame.io', 'FR', 'oklch(0.78 0.13 95)'],
  ['Descript', 'DS', 'oklch(0.72 0.15 300)'],
  ['Riverside', 'RV', 'oklch(0.68 0.16 280)'],
  ['Captivate', 'CP', 'oklch(0.72 0.16 30)'],
  ['Transistor', 'TR', 'oklch(0.7 0.15 200)'],
  ['Megaphone', 'MG', 'oklch(0.74 0.14 145)'],
  ['Spotify', 'SP', 'oklch(0.74 0.16 150)'],
  ['Apple Podcasts', 'AP', 'oklch(0.72 0.15 320)'],
  ['RSS', 'RS', 'oklch(0.74 0.15 50)'],
  ['Slack', 'SL', 'oklch(0.72 0.13 330)'],
  ['Notion', 'NO', 'oklch(0.85 0.01 264)'],
  ['Google Drive', 'GD', 'oklch(0.74 0.14 145)'],
  ['Zapier', 'ZP', 'oklch(0.72 0.16 35)'],
  ['Calendar', 'CA', 'oklch(0.7 0.14 264)'],
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

function MarqueeTrack({ items, reverse }: { items: typeof INTEGRATIONS[number][]; reverse?: boolean }) {
  const doubled = [...items, ...items]
  return (
    <div className="relative overflow-hidden" style={{ maskImage: 'linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)' }}>
      <div
        className={`flex gap-3.5 w-max hover:[animation-play-state:paused] ${reverse ? 'animate-[scrollx_46s_linear_infinite_reverse]' : 'animate-[scrollx_38s_linear_infinite]'}`}
      >
        {doubled.map(([name, abbr, color], i) => (
          <Chip key={`${name}-${i}`} name={name} abbr={abbr} color={color} />
        ))}
      </div>
    </div>
  )
}

export function IntegrationMarquee() {
  const row1 = INTEGRATIONS.slice(0, 8)
  const row2 = INTEGRATIONS.slice(6)

  return (
    <section id="integrations" className="py-[78px] border-t border-b border-border-subtle bg-bg-deeper">
      <div className="text-center text-sm text-text-tertiary mb-9 reveal">
        Drops into the stack you already run. <b className="text-text-secondary font-semibold">Files, recording, hosting, comms</b>, all wired in.
      </div>
      <div className="space-y-3.5">
        <MarqueeTrack items={[...row1]} />
        <MarqueeTrack items={[...row2]} reverse />
      </div>
    </section>
  )
}

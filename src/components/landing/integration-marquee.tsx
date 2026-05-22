import { type ComponentType, type SVGProps } from 'react'
import {
  SiGoogledrive,
  SiVimeo,
  SiDeepgram,
  SiAnthropic,
  SiStripe,
  SiN8n,
  SiDiscord,
  SiNotion,
  SiAirtable,
  SiGooglesheets,
  SiYoutube,
  SiDropbox,
  SiCalendly,
  SiMailchimp,
  SiTrello,
  SiHubspot,
  SiWordpress,
  SiX,
  SiCloudflare,
} from '@icons-pack/react-simple-icons'

type IconComponent = ComponentType<SVGProps<SVGSVGElement> & { size?: number; color?: string }>

function FrameioIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M2.4 0h19.2A2.4 2.4 0 0124 2.4v19.2a2.4 2.4 0 01-2.4 2.4H2.4A2.4 2.4 0 010 21.6V2.4A2.4 2.4 0 012.4 0zm3.12 5.76v12.48h2.88V5.76zm4.32 0v12.48h2.88V5.76zm4.32 0v8.16h2.88V5.76z" />
    </svg>
  )
}

function TransistorIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14H8V8h2v8zm4 2h-2V6h2v12zm4-4h-2V8h2v6z" />
    </svg>
  )
}

function CastopodIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 1C5.925 1 1 5.925 1 12s4.925 11 11 11 11-4.925 11-11S18.075 1 12 1zm0 4a7 7 0 110 14 7 7 0 010-14zm0 3a4 4 0 100 8 4 4 0 000-8zm0 2.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3z" />
    </svg>
  )
}

function SlackIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M5.042 15.165a2.528 2.528 0 01-2.52 2.523A2.528 2.528 0 010 15.165a2.527 2.527 0 012.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 012.521-2.52 2.527 2.527 0 012.521 2.52v6.313A2.528 2.528 0 018.834 24a2.528 2.528 0 01-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 01-2.521-2.52A2.528 2.528 0 018.834 0a2.528 2.528 0 012.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 012.521 2.521 2.528 2.528 0 01-2.521 2.521H2.522A2.528 2.528 0 010 8.834a2.528 2.528 0 012.522-2.521h6.312zm10.123 2.521a2.528 2.528 0 012.521-2.521A2.528 2.528 0 0124 8.834a2.528 2.528 0 01-2.522 2.521h-2.521V8.834zm-1.268 0a2.528 2.528 0 01-2.523 2.521 2.527 2.527 0 01-2.52-2.521V2.522A2.527 2.527 0 0115.165 0a2.528 2.528 0 012.523 2.522v6.312zm-2.523 10.123a2.528 2.528 0 012.523 2.521A2.528 2.528 0 0115.165 24a2.527 2.527 0 01-2.52-2.522v-2.521h2.52zm0-1.268a2.527 2.527 0 01-2.52-2.523 2.526 2.526 0 012.52-2.52h6.313A2.527 2.527 0 0124 15.165a2.528 2.528 0 01-2.522 2.523h-6.313z" />
    </svg>
  )
}

function LinkedInIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  )
}

interface Integration {
  name: string
  icon: IconComponent | ComponentType<SVGProps<SVGSVGElement>>
  color: string
}

const INTEGRATIONS: Integration[] = [
  { name: 'Frame.io', icon: FrameioIcon, color: '#9B59FF' },
  { name: 'Google Drive', icon: SiGoogledrive as IconComponent, color: '#4285F4' },
  { name: 'Vimeo', icon: SiVimeo as IconComponent, color: '#1AB7EA' },
  { name: 'Transistor.fm', icon: TransistorIcon, color: '#6B50FF' },
  { name: 'Castopod', icon: CastopodIcon, color: '#00564A' },
  { name: 'Deepgram', icon: SiDeepgram as IconComponent, color: '#13EF93' },
  { name: 'Claude AI', icon: SiAnthropic as IconComponent, color: '#D4A27F' },
  { name: 'Stripe', icon: SiStripe as IconComponent, color: '#635BFF' },
  { name: 'n8n', icon: SiN8n as IconComponent, color: '#EA4B71' },
  { name: 'Slack', icon: SlackIcon, color: '#4A154B' },
  { name: 'Discord', icon: SiDiscord as IconComponent, color: '#5865F2' },
  { name: 'Notion', icon: SiNotion as IconComponent, color: '#FFFFFF' },
  { name: 'Airtable', icon: SiAirtable as IconComponent, color: '#18BFFF' },
  { name: 'Google Sheets', icon: SiGooglesheets as IconComponent, color: '#34A853' },
  { name: 'YouTube', icon: SiYoutube as IconComponent, color: '#FF0000' },
  { name: 'Dropbox', icon: SiDropbox as IconComponent, color: '#0061FF' },
  { name: 'Calendly', icon: SiCalendly as IconComponent, color: '#006BFF' },
  { name: 'Mailchimp', icon: SiMailchimp as IconComponent, color: '#FFE01B' },
  { name: 'Trello', icon: SiTrello as IconComponent, color: '#0052CC' },
  { name: 'HubSpot', icon: SiHubspot as IconComponent, color: '#FF7A59' },
  { name: 'WordPress', icon: SiWordpress as IconComponent, color: '#21759B' },
  { name: 'X / Twitter', icon: SiX as IconComponent, color: '#FFFFFF' },
  { name: 'LinkedIn', icon: LinkedInIcon, color: '#0A66C2' },
  { name: 'Cloudflare R2', icon: SiCloudflare as IconComponent, color: '#F38020' },
]

function Chip({ name, icon: Icon, color }: Integration) {
  return (
    <div className="flex items-center gap-3 px-5 py-3 border border-border-subtle bg-surface-raised rounded-lg text-base font-medium text-text-secondary whitespace-nowrap hover:border-border-strong hover:text-text-primary hover:bg-surface-overlay transition-colors">
      <span className="w-[22px] h-[22px] shrink-0 grid place-items-center">
        <Icon width={20} height={20} color={color} />
      </span>
      {name}
    </div>
  )
}

function MarqueeTrack({ items }: { items: Integration[] }) {
  const doubled = [...items, ...items]
  return (
    <div className="relative overflow-hidden" style={{ maskImage: 'linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)' }}>
      <div className="flex gap-4 w-max hover:[animation-play-state:paused] animate-[scrollx_60s_linear_infinite]">
        {doubled.map((integration, i) => (
          <Chip key={`${integration.name}-${i}`} {...integration} />
        ))}
      </div>
    </div>
  )
}

export function IntegrationMarquee() {
  return (
    <section id="integrations" className="py-[78px] border-t border-b border-border-subtle bg-bg-deeper">
      <div className="max-w-[1200px] mx-auto px-7 text-center reveal">
        <span className="font-mono text-xs tracking-[0.12em] uppercase text-accent">Integrations</span>
        <h2 className="font-[family-name:var(--font-display)] text-[clamp(28px,3.4vw,40px)] font-semibold text-text-primary leading-[1.12] tracking-[-0.022em] mt-3.5 mb-10">Connect to the tools you already use.</h2>
      </div>
      <MarqueeTrack items={INTEGRATIONS} />
    </section>
  )
}

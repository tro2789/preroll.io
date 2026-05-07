const logos: Record<string, string> = {
  frame_io: '/images/providers/frame-io.jpeg',
  google_drive: '/images/providers/google-drive.svg',
  vimeo: '/images/providers/vimeo.png',
  dropbox: '/images/providers/dropbox.svg',
}

export function ProviderLogo({ provider, className }: { provider: string; className?: string }) {
  const src = logos[provider]
  const size = className || 'w-8 h-8'

  if (!src) {
    return (
      <div className={`rounded-lg bg-surface-overlay flex items-center justify-center ${size}`}>
        <span className="text-xs font-bold text-text-tertiary">?</span>
      </div>
    )
  }

  return (
    <img src={src} alt="" className={`rounded-lg object-cover ${size}`} />
  )
}

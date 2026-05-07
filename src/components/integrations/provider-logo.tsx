const logos: Record<string, { bg: string; icon: React.ReactNode }> = {
  frame_io: {
    bg: 'bg-[#7B61FF]',
    icon: (
      <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4">
        <path d="M4 4h16v4H8v3h10v4H8v5H4V4z" />
      </svg>
    ),
  },
  google_drive: {
    bg: 'bg-[#1A73E8]',
    icon: (
      <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4">
        <path d="M8.58 2 2 14l3.46 6h6.92L8.58 2Zm1.84 0 6.46 12H24L17.54 2h-7.12ZM16 14.58l-3.46 6h13.84l3.46-6H16Z" transform="scale(0.85) translate(2,2)" />
      </svg>
    ),
  },
  vimeo: {
    bg: 'bg-[#1AB7EA]',
    icon: (
      <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4">
        <path d="M22 7.42c-.1 2.1-1.56 4.98-4.38 8.64C14.7 19.98 12.14 22 10.1 22c-1.26 0-2.32-1.16-3.18-3.48L5.1 12c-.56-2.32-1.16-3.48-1.8-3.48-.14 0-.62.3-1.46.88L1 8.28c.92-.8 1.82-1.62 2.72-2.44 1.22-1.06 2.14-1.62 2.76-1.68 1.44-.14 2.34.86 2.68 3 .38 2.32.64 3.76.78 4.32.44 1.98.92 2.96 1.44 2.96.4 0 1.02-.64 1.84-1.92.82-1.28 1.26-2.26 1.32-2.92.12-1.1-.32-1.66-1.32-1.66-.46 0-.94.1-1.44.32.96-3.14 2.78-4.66 5.48-4.58 2 .06 2.94 1.36 2.84 3.9l-.1.24Z" />
      </svg>
    ),
  },
  dropbox: {
    bg: 'bg-[#0061FF]',
    icon: (
      <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4">
        <path d="m7.1 3-5.1 3.3 5 3.2 5.1-3.2L7.1 3ZM17 3l-5 3.3 5 3.2 5.1-3.2L17 3ZM2 12.8l5 3.2 5.1-3.2-5-3.2-5.1 3.2ZM17 9.6l-5 3.2 5 3.2 5.1-3.2-5.1-3.2ZM7.1 17.1l5-3.2-5-3.2L2 14l5.1 3.1ZM12 13.9l5 3.2 5.1-3.1-5-3.2-5.1 3.1Z" />
      </svg>
    ),
  },
}

export function ProviderLogo({ provider, className }: { provider: string; className?: string }) {
  const logo = logos[provider]
  if (!logo) {
    return (
      <div className={`rounded-lg bg-surface-overlay flex items-center justify-center ${className || 'w-8 h-8'}`}>
        <span className="text-xs font-bold text-text-tertiary">?</span>
      </div>
    )
  }
  return (
    <div className={`rounded-lg ${logo.bg} flex items-center justify-center ${className || 'w-8 h-8'}`}>
      {logo.icon}
    </div>
  )
}

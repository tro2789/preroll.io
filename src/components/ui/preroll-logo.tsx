interface PrerollLogoProps {
  size?: number
  className?: string
}

export function PrerollLogo({ size = 32, className }: PrerollLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      className={className}
    >
      <rect x="10.5" y="36" width="7" height="28" rx="3.5" fill="currentColor" />
      <rect x="25.5" y="36" width="7" height="28" rx="3.5" fill="currentColor" />
      <rect x="40.5" y="36" width="7" height="28" rx="3.5" fill="currentColor" />
      <circle cx="65.5" cy="50" r="14" fill="#F97316" />
    </svg>
  )
}

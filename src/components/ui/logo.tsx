export function LogoIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
      <path d="M5 4v16" />
      <path d="M12 4v16" />
      <path d="M19 4v16" />
      <circle cx="5" cy="15" r="2.4" fill="currentColor" stroke="none" />
      <circle cx="12" cy="10" r="2.4" fill="currentColor" stroke="none" />
      <circle cx="19" cy="6.5" r="2.4" fill="currentColor" stroke="none" />
    </svg>
  )
}

import { cn } from '@/lib/utils'

interface ViewToolbarProps {
  children: React.ReactNode
  className?: string
  sticky?: boolean
}

export function ViewToolbar({ children, className, sticky = true }: ViewToolbarProps) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2 py-3 px-1 mb-4 border-b border-border-subtle',
        sticky && 'sticky top-12 z-10 bg-surface-base/95 backdrop-blur-sm',
        className
      )}
    >
      {children}
    </div>
  )
}

interface FilterChipProps {
  label: string
  active?: boolean
  onClick?: () => void
  onRemove?: () => void
}

export function FilterChip({ label, active, onClick, onRemove }: FilterChipProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
        active
          ? 'bg-accent-tint text-accent border border-accent-quiet'
          : 'bg-surface-raised text-text-secondary border border-border-subtle hover:border-border-hover'
      )}
    >
      {label}
      {onRemove && active && (
        <span
          role="button"
          onClick={(e) => { e.stopPropagation(); onRemove() }}
          className="ml-0.5 text-current opacity-60 hover:opacity-100"
        >
          ×
        </span>
      )}
    </button>
  )
}

interface ViewToggleProps {
  views: { label: string; value: string; icon?: React.ReactNode }[]
  activeView: string
  onChange: (view: string) => void
}

export function ViewToggle({ views, activeView, onChange }: ViewToggleProps) {
  return (
    <div className="flex items-center rounded-md border border-border-subtle bg-surface-input p-0.5">
      {views.map((view) => (
        <button
          key={view.value}
          onClick={() => onChange(view.value)}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors',
            activeView === view.value
              ? 'bg-surface-raised text-text-primary shadow-sm'
              : 'text-text-secondary hover:text-text-primary'
          )}
        >
          {view.icon}
          {view.label}
        </button>
      ))}
    </div>
  )
}

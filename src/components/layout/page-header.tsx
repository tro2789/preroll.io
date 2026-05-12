import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  description?: string
  tabs?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}

export function PageHeader({ title, description, tabs, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('mb-6', className)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.02em] font-[family-name:var(--font-display)] text-text-primary">{title}</h1>
          {description && (
            <p className="text-[13.5px] text-text-secondary mt-1.5 max-w-[62ch]">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
      {tabs && <div className="mt-4">{tabs}</div>}
    </div>
  )
}

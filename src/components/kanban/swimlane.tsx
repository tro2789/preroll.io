'use client'

interface SwimlaneProps {
  label: string
  columnCount: number
  children: React.ReactNode
}

export function Swimlane({ label, columnCount, children }: SwimlaneProps) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-2 px-1">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
          {label}
        </h3>
        <div className="flex-1 border-t border-border-subtle" />
      </div>
      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}
      >
        {children}
      </div>
    </div>
  )
}

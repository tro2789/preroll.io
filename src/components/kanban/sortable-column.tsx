'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'

interface SortableColumnProps {
  id: string
  name: string
  count: number
  episodeIds: string[]
  wipLimit?: number | null
  collapsed?: boolean
  onToggleCollapse?: () => void
  header?: React.ReactNode
  children: React.ReactNode
  emptyMessage?: string
}

export function SortableColumn({
  id,
  name,
  count,
  episodeIds,
  wipLimit,
  collapsed = false,
  onToggleCollapse,
  header,
  children,
  emptyMessage = 'No episodes',
}: SortableColumnProps) {
  const { isOver, setNodeRef } = useDroppable({ id })
  const atLimit = wipLimit != null && count >= wipLimit
  const overLimit = wipLimit != null && count > wipLimit

  return (
    <div ref={setNodeRef} className="min-w-0 flex flex-col" role="listbox" aria-label={name}>
      {header ?? (
        <div className="flex items-center justify-between px-3 py-2.5">
          <h3 className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
            {name}
          </h3>
          <ColumnCount count={count} wipLimit={wipLimit} />
        </div>
      )}
      <SortableContext items={collapsed ? [] : episodeIds} strategy={verticalListSortingStrategy}>
        <div
          className={`flex-1 flex flex-col gap-[9px] rounded-lg p-1 pb-3 transition-colors ${
            collapsed ? 'min-h-0' : 'min-h-[60px]'
          } ${
            overLimit
              ? 'bg-red-500/10 ring-1 ring-red-500/30'
              : atLimit
                ? 'bg-amber-500/10 ring-1 ring-amber-500/30'
                : isOver
                  ? 'bg-accent-muted/20'
                  : ''
          }`}
        >
          {collapsed ? (
            <div className="py-2 text-center">
              <span className="text-xs text-text-tertiary">{count} episode{count !== 1 ? 's' : ''}</span>
            </div>
          ) : (
            <>
              {children}
              {count === 0 && (
                <div className="rounded-lg border border-dashed border-border-subtle px-3 py-6 text-center">
                  <p className="text-xs text-text-tertiary">{emptyMessage}</p>
                </div>
              )}
            </>
          )}
        </div>
      </SortableContext>
    </div>
  )
}

export function CollapseToggle({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="shrink-0 text-text-tertiary hover:text-text-secondary transition-colors"
      title={collapsed ? 'Expand column' : 'Collapse column'}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className={`h-3.5 w-3.5 transition-transform ${collapsed ? '-rotate-90' : ''}`}
      >
        <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 011.06 0L10 11.94l3.72-3.72a.75.75 0 111.06 1.06l-4.25 4.25a.75.75 0 01-1.06 0L5.22 9.28a.75.75 0 010-1.06z" clipRule="evenodd" />
      </svg>
    </button>
  )
}

export function ColumnCount({ count, wipLimit }: { count: number; wipLimit?: number | null }) {
  if (wipLimit == null) {
    return count > 0 ? <span className="text-xs text-text-tertiary">{count}</span> : null
  }

  const overLimit = count > wipLimit
  const atLimit = count >= wipLimit

  return (
    <span
      className={`text-xs font-medium tabular-nums ${
        overLimit
          ? 'text-red-400'
          : atLimit
            ? 'text-amber-400'
            : 'text-text-tertiary'
      }`}
    >
      {count}/{wipLimit}
    </span>
  )
}

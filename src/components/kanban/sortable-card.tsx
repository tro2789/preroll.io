'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface SortableCardProps {
  id: string
  label?: string
  selected?: boolean
  onToggleSelect?: (id: string) => void
  children: React.ReactNode
}

export function SortableCard({ id, label, selected, onToggleSelect, children }: SortableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative cursor-grab active:cursor-grabbing ${isDragging ? 'opacity-0' : ''} ${
        selected ? 'ring-2 ring-accent rounded-lg' : ''
      }`}
      {...attributes}
      {...listeners}
      role="option"
      aria-roledescription="sortable episode card"
      aria-label={label}
      aria-selected={selected}
    >
      {onToggleSelect && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            e.preventDefault()
            onToggleSelect(id)
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className={`absolute top-2 left-2 z-10 h-4.5 w-4.5 rounded border-2 flex items-center justify-center transition-colors ${
            selected
              ? 'bg-accent border-accent text-white'
              : 'bg-surface-raised/80 border-border-default hover:border-accent backdrop-blur-sm'
          }`}
        >
          {selected && (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3">
              <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
            </svg>
          )}
        </button>
      )}
      {children}
    </div>
  )
}

export function DragOverlayCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rotate-2 scale-105 cursor-grabbing">
      {children}
    </div>
  )
}

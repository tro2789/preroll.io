'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'None' },
  { value: 'planning', label: 'Planning' },
  { value: 'recording', label: 'Recording' },
  { value: 'editing', label: 'Editing' },
  { value: 'review', label: 'Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'published', label: 'Published' },
]

interface Stage {
  id: string
  name: string
  position: number
  status_override: string | null
  wip_limit: number | null
  isNew?: boolean
}

interface StageManagerProps {
  showId: string
  stages: Stage[]
  open: boolean
  onClose: () => void
}

function SortableStageRow({
  stage,
  onUpdate,
  onDelete,
  canDelete,
}: {
  stage: Stage
  onUpdate: (id: string, field: string, value: unknown) => void
  onDelete: (id: string) => void
  canDelete: boolean
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stage.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 rounded-lg border border-border-subtle bg-surface-raised p-3 ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <button
        type="button"
        className="shrink-0 cursor-grab active:cursor-grabbing text-text-tertiary hover:text-text-secondary"
        {...attributes}
        {...listeners}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
          <path fillRule="evenodd" d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zM2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10zm0 5.25a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75z" clipRule="evenodd" />
        </svg>
      </button>

      <input
        type="text"
        value={stage.name}
        onChange={(e) => onUpdate(stage.id, 'name', e.target.value)}
        className="flex-1 min-w-0 rounded-md border border-border-default bg-surface-input px-2 py-1.5 text-sm text-text-primary focus:border-accent focus:outline-none"
        placeholder="Stage name"
      />

      <select
        value={stage.status_override || ''}
        onChange={(e) => onUpdate(stage.id, 'status_override', e.target.value || null)}
        className="w-28 shrink-0 rounded-md border border-border-default bg-surface-input px-2 py-1.5 text-xs text-text-secondary focus:border-accent focus:outline-none"
        title="Status mapping"
      >
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>

      <input
        type="number"
        value={stage.wip_limit ?? ''}
        onChange={(e) => onUpdate(stage.id, 'wip_limit', e.target.value ? Number(e.target.value) : null)}
        className="w-16 shrink-0 rounded-md border border-border-default bg-surface-input px-2 py-1.5 text-xs text-text-secondary text-center focus:border-accent focus:outline-none"
        placeholder="WIP"
        min={1}
        title="WIP limit"
      />

      <button
        type="button"
        onClick={() => onDelete(stage.id)}
        disabled={!canDelete}
        className="shrink-0 text-text-tertiary hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        title="Delete stage"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
          <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
        </svg>
      </button>
    </div>
  )
}

export function StageManager({ showId, stages: initialStages, open, onClose }: StageManagerProps) {
  const router = useRouter()
  const [stages, setStages] = useState<Stage[]>(initialStages)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const updateStage = useCallback((id: string, field: string, value: unknown) => {
    setStages((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    )
  }, [])

  const deleteStage = useCallback((id: string) => {
    setStages((prev) => prev.filter((s) => s.id !== id))
  }, [])

  function addStage() {
    const maxPos = stages.reduce((max, s) => Math.max(max, s.position), 0)
    setStages((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        name: '',
        position: maxPos + 1,
        status_override: null,
        wip_limit: null,
        isNew: true,
      },
    ])
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    setStages((prev) => {
      const oldIndex = prev.findIndex((s) => s.id === active.id)
      const newIndex = prev.findIndex((s) => s.id === over.id)
      const reordered = arrayMove(prev, oldIndex, newIndex)
      return reordered.map((s, i) => ({ ...s, position: i + 1 }))
    })
  }

  async function handleSave() {
    const invalid = stages.find((s) => !s.name.trim())
    if (invalid) {
      setError('All stages must have a name.')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const payload = stages.map((s, i) => ({
        ...(s.isNew ? {} : { id: s.id }),
        name: s.name.trim(),
        position: i + 1,
        status_override: s.status_override,
        wip_limit: s.wip_limit,
      }))

      const res = await fetch(`/api/v1/shows/${showId}/stages`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const json = await res.json().catch(() => ({ error: 'Failed to save' }))
        throw new Error(json.error || 'Failed to save stages')
      }

      router.refresh()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl border border-border-subtle bg-surface-raised shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
          <h2 className="text-sm font-semibold text-text-primary">Manage Pipeline Stages</h2>
          <button
            onClick={onClose}
            className="text-text-tertiary hover:text-text-primary transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-4 max-h-[60vh] overflow-y-auto">
          {error && (
            <div className="mb-3 rounded bg-error/10 border border-error/30 px-3 py-2 text-xs text-error">
              {error}
            </div>
          )}

          <div className="flex items-center gap-2 mb-3 text-[10px] uppercase tracking-wider text-text-tertiary font-medium">
            <span className="w-6" />
            <span className="flex-1">Name</span>
            <span className="w-28 text-center">Status Map</span>
            <span className="w-16 text-center">WIP</span>
            <span className="w-4" />
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={stages.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {stages.map((stage) => (
                  <SortableStageRow
                    key={stage.id}
                    stage={stage}
                    onUpdate={updateStage}
                    onDelete={deleteStage}
                    canDelete={stages.length > 1}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          <button
            type="button"
            onClick={addStage}
            className="mt-3 w-full rounded-lg border border-dashed border-border-subtle px-3 py-2.5 text-xs text-text-tertiary hover:text-text-secondary hover:border-border-default transition-colors"
          >
            + Add Stage
          </button>
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-border-subtle">
          <button
            onClick={onClose}
            className="text-sm text-text-tertiary hover:text-text-primary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

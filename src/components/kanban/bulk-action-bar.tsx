'use client'

import { useState } from 'react'

interface Stage {
  id: string
  name: string
}

interface BulkActionBarProps {
  selectedCount: number
  stages: Stage[]
  onBulkMove: (stageId: string) => Promise<void>
  onClearSelection: () => void
}

export function BulkActionBar({ selectedCount, stages, onBulkMove, onClearSelection }: BulkActionBarProps) {
  const [targetStageId, setTargetStageId] = useState('')
  const [moving, setMoving] = useState(false)

  if (selectedCount === 0) return null

  async function handleMove() {
    if (!targetStageId || moving) return
    setMoving(true)
    try {
      await onBulkMove(targetStageId)
      setTargetStageId('')
    } finally {
      setMoving(false)
    }
  }

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 rounded-xl border border-border-subtle bg-surface-raised px-5 py-3 shadow-xl">
      <span className="text-sm font-medium text-text-primary">
        {selectedCount} selected
      </span>
      <select
        value={targetStageId}
        onChange={(e) => setTargetStageId(e.target.value)}
        className="rounded-md border border-border-default bg-surface-input px-2.5 py-1.5 text-xs text-text-secondary focus:border-accent focus:outline-none"
      >
        <option value="">Move to...</option>
        {stages.map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>
      <button
        onClick={handleMove}
        disabled={!targetStageId || moving}
        className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
      >
        {moving ? 'Moving...' : 'Move'}
      </button>
      <button
        onClick={onClearSelection}
        className="text-xs text-text-tertiary hover:text-text-primary transition-colors"
      >
        Cancel
      </button>
    </div>
  )
}

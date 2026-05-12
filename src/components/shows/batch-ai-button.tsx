'use client'

import { useState } from 'react'

export function BatchAiButton({ showId }: { showId: string }) {
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<{ processed: number; message?: string } | null>(null)

  async function handleBatch() {
    setRunning(true)
    setResult(null)
    try {
      const res = await fetch(`/api/v1/shows/${showId}/batch-pipeline`, {
        method: 'POST',
      })
      if (res.ok) {
        const data = await res.json()
        setResult({
          processed: data.data.processed,
          message: data.data.processed === 0 ? 'No new audio to process' : undefined,
        })
        setTimeout(() => setResult(null), 5000)
      }
    } finally {
      setRunning(false)
    }
  }

  return (
    <button
      onClick={handleBatch}
      disabled={running}
      className="rounded-md border border-border-subtle bg-surface-overlay px-3 py-1.5 text-xs font-medium text-text-primary transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
    >
      {running
        ? 'Processing...'
        : result
        ? result.processed > 0
          ? `${result.processed} queued`
          : result.message || 'Done'
        : 'Run AI'}
    </button>
  )
}

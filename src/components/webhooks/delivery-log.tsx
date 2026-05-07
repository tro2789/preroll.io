'use client'

import { useEffect, useState } from 'react'

interface Delivery {
  id: string
  event_type: string
  status_code: number | null
  error: string | null
  created_at: string
}

export function DeliveryLog({ endpointId }: { endpointId: string }) {
  const [deliveries, setDeliveries] = useState<Delivery[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/v1/webhook-endpoints/${endpointId}/deliveries?limit=20`)
      .then((res) => res.json())
      .then((json) => setDeliveries(json.data || []))
      .catch(() => setDeliveries([]))
      .finally(() => setLoading(false))
  }, [endpointId])

  if (loading) {
    return <p className="text-xs text-text-tertiary">Loading deliveries...</p>
  }

  if (!deliveries?.length) {
    return <p className="text-xs text-text-tertiary">No deliveries yet.</p>
  }

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-text-tertiary uppercase tracking-wider">Recent Deliveries</p>
      {deliveries.map((d) => {
        const isSuccess = d.status_code && d.status_code >= 200 && d.status_code < 300
        return (
          <div
            key={d.id}
            className="flex items-center justify-between gap-3 rounded bg-surface-overlay px-3 py-2"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${
                isSuccess ? 'bg-success' : 'bg-error'
              }`} />
              <span className="text-xs text-text-secondary truncate">{d.event_type}</span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {d.status_code ? (
                <span className={`font-mono text-xs ${isSuccess ? 'text-success' : 'text-error'}`}>
                  {d.status_code}
                </span>
              ) : (
                <span className="text-xs text-error">{d.error || 'Failed'}</span>
              )}
              <span className="text-xs text-text-tertiary">
                {new Date(d.created_at).toLocaleString('en-US', {
                  month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                })}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

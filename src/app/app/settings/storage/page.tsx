'use client'

import { useState, useEffect } from 'react'

interface StorageData {
  usedBytes: number
  limitBytes: number | null
  usedPercent: number
  remaining: number | null
  breakdown: { show: string; bytes: number }[]
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 ** 4) return `${(bytes / 1024 ** 4).toFixed(2)} TB`
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`
  return `${(bytes / 1024).toFixed(0)} KB`
}

export default function StorageSettingsPage() {
  const [data, setData] = useState<StorageData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/v1/storage')
      .then((res) => res.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="max-w-4xl">
        <h1 className="text-2xl font-bold text-text-primary mb-1">Storage</h1>
        <p className="text-sm text-text-secondary mb-8">Manage your built-in file storage.</p>
        <div className="animate-pulse h-32 bg-surface-raised rounded-lg" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="max-w-4xl">
        <h1 className="text-2xl font-bold text-text-primary mb-1">Storage</h1>
        <p className="text-sm text-text-secondary">Failed to load storage data.</p>
      </div>
    )
  }

  const usedLabel = formatBytes(data.usedBytes)
  const limitLabel = data.limitBytes ? formatBytes(data.limitBytes) : 'Unlimited'
  const percent = Math.min(data.usedPercent, 100)
  const isNearLimit = percent >= 80
  const isOverLimit = percent >= 95

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-text-primary mb-1">Storage</h1>
      <p className="text-sm text-text-secondary mb-8">
        Built-in file storage for your episodes and deliverables. Files are stored securely on Cloudflare&apos;s global network.
      </p>

      <div className="border border-border-subtle rounded-lg p-6 bg-surface-raised mb-6">
        <div className="flex items-baseline justify-between mb-3">
          <span className="text-sm font-medium text-text-primary">
            {usedLabel} <span className="text-text-secondary">of {limitLabel} used</span>
          </span>
          <span className={`text-xs font-medium ${isOverLimit ? 'text-red-400' : isNearLimit ? 'text-amber-400' : 'text-text-tertiary'}`}>
            {percent.toFixed(1)}%
          </span>
        </div>

        <div className="h-2.5 bg-surface-overlay rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${isOverLimit ? 'bg-red-500' : isNearLimit ? 'bg-amber-500' : 'bg-accent'}`}
            style={{ width: `${percent}%` }}
          />
        </div>

        {data.remaining !== null && (
          <p className="text-xs text-text-tertiary mt-2">
            {formatBytes(data.remaining)} remaining
          </p>
        )}
      </div>

      {isNearLimit && (
        <div className={`border rounded-lg p-4 mb-6 ${isOverLimit ? 'border-red-500/30 bg-red-500/5' : 'border-amber-500/30 bg-amber-500/5'}`}>
          <p className={`text-sm font-medium ${isOverLimit ? 'text-red-400' : 'text-amber-400'}`}>
            {isOverLimit ? 'Storage almost full' : 'Running low on storage'}
          </p>
          <p className="text-xs text-text-secondary mt-1">
            Upgrade your plan or purchase additional storage to continue uploading files.
          </p>
        </div>
      )}

      {data.breakdown.length > 0 && (
        <div className="border border-border-subtle rounded-lg bg-surface-raised">
          <div className="px-5 py-3 border-b border-border-subtle">
            <h2 className="text-sm font-semibold text-text-primary">Usage by show</h2>
          </div>
          <div className="divide-y divide-border-subtle">
            {data.breakdown.map((item) => (
              <div key={item.show} className="flex items-center justify-between px-5 py-3">
                <span className="text-sm text-text-primary">{item.show}</span>
                <span className="text-sm text-text-secondary">{formatBytes(item.bytes)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.breakdown.length === 0 && (
        <div className="border border-border-subtle rounded-lg p-8 bg-surface-raised text-center">
          <p className="text-sm text-text-secondary">No files stored yet.</p>
          <p className="text-xs text-text-tertiary mt-1">
            Upload files to episodes and they will be stored here automatically.
          </p>
        </div>
      )}
    </div>
  )
}

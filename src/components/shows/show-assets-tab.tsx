'use client'

import { useEffect, useState } from 'react'
import { UploadButton } from '@/components/assets/upload-button'
import { AssetGrid } from '@/components/assets/asset-grid'

type AssetType =
  | 'cover_art'
  | 'intro'
  | 'outro'
  | 'music_bed'
  | 'thumbnail'
  | 'show_notes'
  | 'clip'
  | 'other'

interface Asset {
  id: string
  name: string
  file_key: string
  asset_type: AssetType
  file_size?: number
  mime_type?: string
  created_at: string
}

const FILTER_OPTIONS: { value: AssetType | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'cover_art', label: 'Cover Art' },
  { value: 'intro', label: 'Intros' },
  { value: 'outro', label: 'Outros' },
  { value: 'music_bed', label: 'Music Beds' },
  { value: 'thumbnail', label: 'Thumbnails' },
  { value: 'show_notes', label: 'Show Notes' },
  { value: 'clip', label: 'Clips' },
  { value: 'other', label: 'Other' },
]

export function ShowAssetsTab({ showId }: { showId: string }) {
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<AssetType | 'all'>('all')

  useEffect(() => {
    let cancelled = false
    async function fetchAssets() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/v1/shows/${showId}/assets`)
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Failed to load assets')
        }
        const { data } = await res.json()
        if (!cancelled) setAssets(data)
      } catch (err: unknown) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load assets')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchAssets()
    return () => { cancelled = true }
  }, [showId])

  function handleUploadComplete(asset: Asset) {
    setAssets((prev) => [asset, ...prev])
  }

  const filteredAssets =
    filter === 'all'
      ? assets
      : assets.filter((a) => a.asset_type === filter)

  return (
    <div>
      <UploadButton showId={showId} onUploadComplete={handleUploadComplete} />

      <div className="mt-6 flex flex-wrap gap-2">
        {FILTER_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setFilter(option.value)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === option.value
                ? 'bg-accent-muted text-accent'
                : 'bg-surface-raised text-text-secondary hover:text-text-primary'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <svg
              className="h-6 w-6 animate-spin text-text-tertiary"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
        ) : error ? (
          <div className="rounded-md border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
            {error}
          </div>
        ) : (
          <AssetGrid assets={filteredAssets} />
        )}
      </div>
    </div>
  )
}

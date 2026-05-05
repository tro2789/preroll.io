'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

const ASSET_TYPES = [
  { value: 'thumbnail', label: 'Thumbnail' },
  { value: 'show_notes', label: 'Show Notes' },
  { value: 'clip', label: 'Social Clip' },
  { value: 'cover_art', label: 'Cover Art' },
  { value: 'other', label: 'Other' },
] as const

type AssetType = (typeof ASSET_TYPES)[number]['value']

interface Asset {
  id: string
  name: string
  file_key: string
  asset_type: AssetType
  file_size?: number
  mime_type?: string
  url?: string
  created_at: string
}

interface EpisodeAssetsProps {
  episodeId: string
}

function formatFileSize(bytes?: number): string {
  if (bytes == null) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const typeLabels: Record<string, string> = {
  thumbnail: 'Thumbnail', show_notes: 'Show Notes', clip: 'Social Clip',
  cover_art: 'Cover Art', intro: 'Intro', outro: 'Outro',
  music_bed: 'Music Bed', other: 'Other',
}

export function EpisodeAssets({ episodeId }: EpisodeAssetsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [assetType, setAssetType] = useState<AssetType>('thumbnail')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAssets = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/episodes/${episodeId}/assets`)
      if (!res.ok) return
      const json = await res.json()
      setAssets(json.data || [])
    } catch {} finally {
      setLoading(false)
    }
  }, [episodeId])

  useEffect(() => { fetchAssets() }, [fetchAssets])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError(null)

    try {
      const urlRes = await fetch(`/api/v1/episodes/${episodeId}/assets/upload-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, contentType: file.type, assetType }),
      })
      if (!urlRes.ok) {
        const err = await urlRes.json()
        throw new Error(err.error || 'Failed to get upload URL')
      }
      const { data } = await urlRes.json()

      const uploadRes = await fetch(data.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      })
      if (!uploadRes.ok) throw new Error('Failed to upload file')

      const assetRes = await fetch(`/api/v1/episodes/${episodeId}/assets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: file.name,
          file_key: data.fileKey,
          asset_type: assetType,
          file_size: file.size,
          mime_type: file.type,
        }),
      })
      if (!assetRes.ok) {
        const err = await assetRes.json()
        throw new Error(err.error || 'Failed to save asset')
      }

      await fetchAssets()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function getAssetUrl(asset: Asset): string | null {
    return asset.url || null
  }

  function isImage(asset: Asset): boolean {
    return asset.mime_type?.startsWith('image/') || false
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-medium text-text-tertiary">
          Assets{assets.length > 0 ? ` (${assets.length})` : ''}
        </h4>
      </div>

      {/* Upload row */}
      <div className="flex items-center gap-1.5">
        <select
          value={assetType}
          onChange={(e) => setAssetType(e.target.value as AssetType)}
          disabled={uploading}
          className="min-w-0 flex-1 rounded border border-border-default bg-surface-input px-1.5 py-1 text-xs text-text-primary focus:border-accent focus:outline-none"
        >
          {ASSET_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="shrink-0 rounded bg-accent px-2 py-1 text-xs font-medium text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
        >
          {uploading ? '...' : 'Upload'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleUpload}
          disabled={uploading}
          className="hidden"
        />
      </div>

      {error && <p className="text-xs text-error">{error}</p>}

      {/* Asset list */}
      {!loading && assets.length > 0 && (
        <div className="space-y-1.5">
          {assets.map((asset) => {
            const url = getAssetUrl(asset)
            return (
              <div key={asset.id} className="flex items-center gap-2 rounded border border-border-subtle bg-surface-overlay px-2 py-1.5">
                {isImage(asset) && url ? (
                  <a href={url} target="_blank" rel="noopener noreferrer" className="shrink-0 block w-10 h-10 rounded overflow-hidden">
                    <img src={url} alt="" className="h-full w-full object-cover" />
                  </a>
                ) : (
                  <div className="shrink-0 w-10 h-10 rounded bg-surface-raised flex items-center justify-center text-xs text-text-tertiary">
                    {asset.name.split('.').pop()?.toUpperCase() || '?'}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-text-primary truncate">{asset.name}</p>
                  <div className="flex items-center gap-1.5 text-[10px] text-text-tertiary">
                    <span>{typeLabels[asset.asset_type] || asset.asset_type}</span>
                    {asset.file_size && <span>&middot; {formatFileSize(asset.file_size)}</span>}
                  </div>
                </div>
                {url && (
                  <a href={url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-xs text-accent hover:text-accent-hover">
                    View
                  </a>
                )}
              </div>
            )
          })}
        </div>
      )}

      {!loading && assets.length === 0 && (
        <p className="text-xs text-text-tertiary">No assets yet.</p>
      )}
    </div>
  )
}

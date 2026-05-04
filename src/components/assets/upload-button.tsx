'use client'

import { useRef, useState } from 'react'

const ASSET_TYPES = [
  { value: 'cover_art', label: 'Cover Art' },
  { value: 'intro', label: 'Intro' },
  { value: 'outro', label: 'Outro' },
  { value: 'music_bed', label: 'Music Bed' },
  { value: 'thumbnail', label: 'Thumbnail' },
  { value: 'show_notes', label: 'Show Notes' },
  { value: 'clip', label: 'Clip' },
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
  created_at: string
}

interface UploadButtonProps {
  showId: string
  onUploadComplete: (asset: Asset) => void
}

export function UploadButton({ showId, onUploadComplete }: UploadButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [assetType, setAssetType] = useState<AssetType>('other')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError(null)

    try {
      // Step 1: Get presigned upload URL
      const urlRes = await fetch(`/api/v1/shows/${showId}/assets/upload-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          assetType,
        }),
      })

      if (!urlRes.ok) {
        const err = await urlRes.json()
        throw new Error(err.error || 'Failed to get upload URL')
      }

      const { data } = await urlRes.json()
      const { uploadUrl, fileKey } = data

      // Step 2: Upload file directly to R2
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      })

      if (!uploadRes.ok) {
        throw new Error('Failed to upload file to storage')
      }

      // Step 3: Create asset metadata
      const assetRes = await fetch(`/api/v1/shows/${showId}/assets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: file.name,
          file_key: fileKey,
          asset_type: assetType,
          file_size: file.size,
          mime_type: file.type,
        }),
      })

      if (!assetRes.ok) {
        const err = await assetRes.json()
        throw new Error(err.error || 'Failed to save asset metadata')
      }

      const { data: asset } = await assetRes.json()
      onUploadComplete(asset)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      // Reset file input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <select
        value={assetType}
        onChange={(e) => setAssetType(e.target.value as AssetType)}
        disabled={uploading}
        className="rounded-md border border-border-default bg-surface-input px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
      >
        {ASSET_TYPES.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="inline-flex items-center rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {uploading ? (
          <>
            <svg
              className="mr-2 h-4 w-4 animate-spin"
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
            Uploading...
          </>
        ) : (
          'Upload Asset'
        )}
      </button>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileSelected}
        disabled={uploading}
      />

      {error && (
        <span className="text-sm text-error">{error}</span>
      )}
    </div>
  )
}

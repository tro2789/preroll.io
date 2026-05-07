'use client'

import { useState, useRef } from 'react'
import { getGradient } from '@/lib/ui/gradient'

interface ThumbnailUploadProps {
  id: string
  imageUrl: string | null
  showId: string
  episodeId?: string
  onUploaded: (fileKey: string) => void
  className?: string
}

export function ThumbnailUpload({ id, imageUrl, showId, episodeId, onUploaded, className = '' }: ThumbnailUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(imageUrl)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setPreviewUrl(URL.createObjectURL(file))

    try {
      const uploadUrlEndpoint = episodeId
        ? `/api/v1/episodes/${episodeId}/assets/upload-url`
        : `/api/v1/shows/${showId}/assets/upload-url`
      const res = await fetch(uploadUrlEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          assetType: 'thumbnail',
        }),
      })

      const { data } = await res.json()
      if (!data?.uploadUrl) throw new Error('Failed to get upload URL')

      await fetch(data.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      })

      onUploaded(data.fileKey)
    } catch {
      setPreviewUrl(imageUrl)
    } finally {
      setUploading(false)
    }
  }

  const gradient = getGradient(id)

  return (
    <div className={`relative group ${className}`}>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="w-full aspect-[16/9] rounded-lg overflow-hidden border border-border-subtle hover:border-border-default transition-colors cursor-pointer"
      >
        {previewUrl ? (
          <img
            src={previewUrl}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className="w-full h-full"
            style={{ background: gradient }}
          />
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition-colors rounded-lg">
          <span className="text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
            {uploading ? 'Uploading...' : previewUrl ? 'Change image' : 'Add image'}
          </span>
        </div>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  )
}

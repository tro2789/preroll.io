'use client'

import { useRef, useState } from 'react'

interface ImageUploadFieldProps {
  label: string
  currentUrl: string | null
  fallbackInitial: string
  onUpload: (file: File) => Promise<void>
  accept?: string
  hint?: string
  shape?: 'circle' | 'rounded'
  size?: 'sm' | 'md'
}

export function ImageUploadField({
  label,
  currentUrl,
  fallbackInitial,
  onUpload,
  accept = 'image/jpeg,image/png,image/webp',
  hint = 'JPG, PNG, or WebP. Max 2MB.',
  shape = 'circle',
  size = 'md',
}: ImageUploadFieldProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const imgSize = size === 'md' ? 'h-20 w-20' : 'h-16 w-16'
  const shapeClass = shape === 'circle' ? 'rounded-full' : 'rounded-xl'
  const textSize = size === 'md' ? 'text-2xl' : 'text-xl'

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError(null)
    try {
      await onUpload(file)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div>
      <h2 className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
        {label}
      </h2>
      <div className="mt-4 flex items-center gap-5">
        <div className="relative">
          {currentUrl ? (
            <img
              src={currentUrl}
              alt={label}
              className={`${imgSize} ${shapeClass} object-cover border-2 border-border-default`}
            />
          ) : (
            <div
              className={`flex ${imgSize} items-center justify-center ${shapeClass} bg-accent/15 text-accent ${textSize} font-bold border-2 border-border-default`}
            >
              {fallbackInitial.charAt(0).toUpperCase()}
            </div>
          )}
          {uploading && (
            <div
              className={`absolute inset-0 flex items-center justify-center ${shapeClass} bg-black/50`}
            >
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            </div>
          )}
        </div>
        <div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="rounded-lg border border-border-default bg-surface-overlay px-4 py-2 text-sm font-medium text-text-primary hover:bg-surface-input transition-colors disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : `Upload ${label}`}
          </button>
          <p className="mt-1.5 text-xs text-text-tertiary">{hint}</p>
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleChange}
            className="hidden"
          />
        </div>
      </div>
      {error && (
        <p className="mt-2 text-sm text-error">{error}</p>
      )}
    </div>
  )
}

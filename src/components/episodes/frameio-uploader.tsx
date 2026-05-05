'use client'

import { useState, useRef, useCallback } from 'react'

interface UploadingFile {
  name: string
  totalBytes: number
  uploadedBytes: number
  status: 'uploading' | 'done' | 'error'
  error?: string
}

interface FrameIoUploaderProps {
  episodeId: string
  onUploadComplete: () => void
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  const value = bytes / Math.pow(1024, i)
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

const MAX_CONCURRENT = 3

export function FrameIoUploader({ episodeId, onUploadComplete }: FrameIoUploaderProps) {
  const [uploads, setUploads] = useState<UploadingFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const activeCountRef = useRef(0)
  const queueRef = useRef<File[]>([])

  const updateUpload = useCallback((name: string, updates: Partial<UploadingFile>) => {
    setUploads((prev) =>
      prev.map((u) => (u.name === name ? { ...u, ...updates } : u))
    )
  }, [])

  const processFile = useCallback(
    async (file: File) => {
      activeCountRef.current++
      try {
        // Step 1: Initiate upload via our API
        const initRes = await fetch(`/api/v1/episodes/${episodeId}/frameio-upload`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: file.name, file_size: file.size }),
        })

        if (!initRes.ok) {
          const json = await initRes.json().catch(() => ({ error: 'Upload init failed' }))
          throw new Error(json.error || `Upload init failed (${initRes.status})`)
        }

        const { data } = await initRes.json()
        const { uploadUrls } = data as { fileId: string; uploadUrls: { url: string; size: number }[] }

        // Step 2: Upload each chunk to presigned URLs
        let offset = 0
        for (const urlInfo of uploadUrls) {
          const chunkSize = urlInfo.size
          const chunk = file.slice(offset, offset + chunkSize)
          offset += chunkSize

          const putRes = await fetch(urlInfo.url, {
            method: 'PUT',
            headers: {
              'x-amz-acl': 'private',
              'Content-Type': file.type || 'application/octet-stream',
            },
            body: chunk,
          })

          if (!putRes.ok) {
            throw new Error(`Chunk upload failed (${putRes.status})`)
          }

          updateUpload(file.name, { uploadedBytes: Math.min(offset, file.size) })
        }

        updateUpload(file.name, { status: 'done', uploadedBytes: file.size })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Upload failed'
        updateUpload(file.name, { status: 'error', error: message })
      } finally {
        activeCountRef.current--
        // Process next file from queue
        const next = queueRef.current.shift()
        if (next) {
          processFile(next)
        } else if (activeCountRef.current === 0) {
          // All done
          onUploadComplete()
        }
      }
    },
    [episodeId, onUploadComplete, updateUpload]
  )

  const startUploads = useCallback(
    (files: File[]) => {
      if (files.length === 0) return

      // Add all files to state
      const newUploads: UploadingFile[] = files.map((f) => ({
        name: f.name,
        totalBytes: f.size,
        uploadedBytes: 0,
        status: 'uploading' as const,
      }))
      setUploads((prev) => [...prev, ...newUploads])

      // Queue all files, then kick off up to MAX_CONCURRENT
      queueRef.current.push(...files)
      while (activeCountRef.current < MAX_CONCURRENT && queueRef.current.length > 0) {
        const file = queueRef.current.shift()!
        processFile(file)
      }
    },
    [processFile]
  )

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
    startUploads(files)
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    startUploads(files)
    // Reset input so re-selecting the same file works
    e.target.value = ''
  }

  const activeUploads = uploads.filter((u) => u.status === 'uploading' || u.status === 'done')

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-6 transition-colors ${
          isDragging
            ? 'border-accent bg-accent/5'
            : 'border-border-subtle hover:border-text-tertiary'
        }`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="mb-2 h-6 w-6 text-text-tertiary"
        >
          <path d="M9.25 13.25a.75.75 0 0 0 1.5 0V4.636l2.955 3.129a.75.75 0 0 0 1.09-1.03l-4.25-4.5a.75.75 0 0 0-1.09 0l-4.25 4.5a.75.75 0 1 0 1.09 1.03L9.25 4.636v8.614Z" />
          <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
        </svg>
        <p className="text-sm text-text-secondary">
          Drop files here or <span className="text-accent">browse</span>
        </p>
        <p className="mt-0.5 text-xs text-text-tertiary">
          Upload to Frame.io project
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileInput}
          className="hidden"
        />
      </div>

      {/* Progress bars */}
      {activeUploads.length > 0 && (
        <div className="space-y-2">
          {activeUploads.map((u) => {
            const pct = u.totalBytes > 0 ? Math.round((u.uploadedBytes / u.totalBytes) * 100) : 0
            return (
              <div key={u.name} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="truncate text-text-primary">{u.name}</span>
                  <span className="ml-2 shrink-0 text-text-tertiary">
                    {u.status === 'done' ? (
                      <span className="text-emerald-400">Done</span>
                    ) : u.status === 'error' ? (
                      <span className="text-red-400" title={u.error}>
                        Failed
                      </span>
                    ) : (
                      `${pct}%`
                    )}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-overlay">
                  <div
                    className={`h-full rounded-full transition-all ${
                      u.status === 'error'
                        ? 'bg-red-500'
                        : u.status === 'done'
                          ? 'bg-emerald-500'
                          : 'bg-accent'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

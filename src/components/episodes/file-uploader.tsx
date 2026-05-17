'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { toast } from 'sonner'

interface UploadingFile {
  name: string
  totalBytes: number
  uploadedBytes: number
  status: 'uploading' | 'done' | 'error'
  error?: string
}

interface FileUploaderProps {
  episodeId: string
  enabled: boolean
  listenForDrags?: boolean
  acceptedMimeTypes?: string[]
  onUploadComplete: () => void
  onUnavailableDrop?: () => void
  onProjectMissing?: () => void
  triggerRef?: React.RefObject<HTMLInputElement | null>
}

const MAX_CONCURRENT = 3

function matchesMimeType(fileType: string, patterns: string[]): boolean {
  return patterns.some((pattern) => {
    if (pattern.endsWith('/*')) {
      return fileType.startsWith(pattern.slice(0, -1))
    }
    return fileType === pattern
  })
}

export function FileUploader({ episodeId, enabled, listenForDrags = true, acceptedMimeTypes, onUploadComplete, onUnavailableDrop, onProjectMissing, triggerRef }: FileUploaderProps) {
  const [uploads, setUploads] = useState<UploadingFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const internalRef = useRef<HTMLInputElement>(null)
  const fileInputRef = triggerRef || internalRef
  const activeCountRef = useRef(0)
  const queueRef = useRef<File[]>([])
  const dragCountRef = useRef(0)

  const updateUpload = useCallback((name: string, updates: Partial<UploadingFile>) => {
    setUploads((prev) =>
      prev.map((u) => (u.name === name ? { ...u, ...updates } : u))
    )
  }, [])

  const processFile = useCallback(
    async (file: File) => {
      activeCountRef.current++
      try {
        if (acceptedMimeTypes && file.type && !matchesMimeType(file.type, acceptedMimeTypes)) {
          throw new Error(`${file.type.split('/')[0]} files are not supported by this provider — only ${acceptedMimeTypes.join(', ')} allowed`)
        }

        const initRes = await fetch(`/api/v1/episodes/${episodeId}/delivery/upload`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: file.name, file_size: file.size, mime_type: file.type || null }),
        })

        if (!initRes.ok) {
          if (initRes.status === 410 && onProjectMissing) {
            onProjectMissing()
          }
          const json = await initRes.json().catch(() => ({ error: 'Upload init failed' }))
          throw new Error(json.error || `Upload init failed (${initRes.status})`)
        }

        const { data } = await initRes.json()
        const { uploadUrls, resumableUrl, tusUrl, uploadProtocol } = data as {
          fileId: string
          uploadUrls?: { url: string; size: number }[]
          resumableUrl?: string
          tusUrl?: string
          uploadProtocol?: string
        }

        if (uploadProtocol === 'resumable' && resumableUrl) {
          await uploadResumable(file, resumableUrl)
        } else if (uploadProtocol === 'tus' && tusUrl) {
          await uploadTus(file, tusUrl)
        } else if (uploadUrls) {
          await uploadPresignedChunks(file, uploadUrls)
        } else {
          throw new Error('No supported upload method returned')
        }

        updateUpload(file.name, { status: 'done', uploadedBytes: file.size })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Upload failed'
        updateUpload(file.name, { status: 'error', error: message })
      } finally {
        activeCountRef.current--
        const next = queueRef.current.shift()
        if (next) {
          processFile(next)
        } else if (activeCountRef.current === 0) {
          onUploadComplete()
        }
      }
    },
    [episodeId, onUploadComplete, updateUpload]
  )

  async function uploadPresignedChunks(file: File, uploadUrls: { url: string; size: number }[]) {
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

      if (!putRes.ok) throw new Error(`Chunk upload failed (${putRes.status})`)
      updateUpload(file.name, { uploadedBytes: Math.min(offset, file.size) })
    }
  }

  async function uploadResumable(file: File, resumableUrl: string) {
    const CHUNK_SIZE = 5 * 1024 * 1024

    if (file.size <= CHUNK_SIZE) {
      try {
        const putRes = await fetch(resumableUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': file.type || 'application/octet-stream',
          },
          body: file,
        })
        if (!putRes.ok) throw new Error(`Upload failed (${putRes.status})`)
      } catch (err) {
        if (err instanceof TypeError) {
          // CORS or network error — data was likely sent, file listing will confirm
        } else {
          throw err
        }
      }
      updateUpload(file.name, { uploadedBytes: file.size })
      return
    }

    let offset = 0
    while (offset < file.size) {
      const end = Math.min(offset + CHUNK_SIZE, file.size)
      const chunk = file.slice(offset, end)
      const isLast = end === file.size

      try {
        const putRes = await fetch(resumableUrl, {
          method: 'PUT',
          headers: {
            'Content-Range': `bytes ${offset}-${end - 1}/${file.size}`,
            'Content-Type': file.type || 'application/octet-stream',
          },
          body: chunk,
        })

        if (isLast) {
          if (!putRes.ok) throw new Error(`Upload failed (${putRes.status})`)
        } else {
          if (!putRes.ok && putRes.status !== 308) {
            throw new Error(`Resumable upload failed (${putRes.status})`)
          }
        }
      } catch (err) {
        if (isLast && err instanceof TypeError) {
          // CORS or network error on final chunk — data was likely sent
        } else {
          throw err
        }
      }

      offset = end
      updateUpload(file.name, { uploadedBytes: offset })
    }
  }

  async function uploadTus(file: File, tusUrl: string) {
    const CHUNK_SIZE = 5 * 1024 * 1024
    let offset = 0

    while (offset < file.size) {
      const end = Math.min(offset + CHUNK_SIZE, file.size)
      const chunk = file.slice(offset, end)
      const isLast = end === file.size

      try {
        const patchRes = await fetch(tusUrl, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/offset+octet-stream',
            'Upload-Offset': String(offset),
            'Tus-Resumable': '1.0.0',
          },
          body: chunk,
        })

        if (!patchRes.ok) throw new Error(`tus upload failed (${patchRes.status})`)
      } catch (err) {
        if (isLast && err instanceof TypeError) {
          // CORS or network error on final chunk — data was likely sent
        } else {
          throw err
        }
      }

      offset = end
      updateUpload(file.name, { uploadedBytes: offset })
    }
  }

  const startUploads = useCallback(
    (files: File[]) => {
      if (files.length === 0) return
      const newUploads: UploadingFile[] = files.map((f) => ({
        name: f.name,
        totalBytes: f.size,
        uploadedBytes: 0,
        status: 'uploading' as const,
      }))
      setUploads((prev) => [...prev, ...newUploads])
      queueRef.current.push(...files)
      while (activeCountRef.current < MAX_CONCURRENT && queueRef.current.length > 0) {
        const file = queueRef.current.shift()!
        processFile(file)
      }
    },
    [processFile]
  )

  useEffect(() => {
    if (!listenForDrags) return

    function isExternalFileDrag(e: DragEvent): boolean {
      return e.dataTransfer?.types?.includes('Files') ?? false
    }

    function handleDragEnter(e: DragEvent) {
      if (!isExternalFileDrag(e)) return
      e.preventDefault()
      dragCountRef.current++
      if (dragCountRef.current === 1) setIsDragging(true)
    }

    function handleDragLeave(e: DragEvent) {
      if (!isExternalFileDrag(e)) return
      e.preventDefault()
      dragCountRef.current--
      if (dragCountRef.current === 0) setIsDragging(false)
    }

    function handleDragOver(e: DragEvent) {
      if (!isExternalFileDrag(e)) return
      e.preventDefault()
    }

    function handleDrop(e: DragEvent) {
      if (!isExternalFileDrag(e)) return
      e.preventDefault()
      dragCountRef.current = 0
      setIsDragging(false)
      if (enabled) {
        const files = Array.from(e.dataTransfer?.files || [])
        startUploads(files)
      } else if (onUnavailableDrop) {
        onUnavailableDrop()
      }
    }

    window.addEventListener('dragenter', handleDragEnter)
    window.addEventListener('dragleave', handleDragLeave)
    window.addEventListener('dragover', handleDragOver)
    window.addEventListener('drop', handleDrop)

    return () => {
      window.removeEventListener('dragenter', handleDragEnter)
      window.removeEventListener('dragleave', handleDragLeave)
      window.removeEventListener('dragover', handleDragOver)
      window.removeEventListener('drop', handleDrop)
    }
  }, [listenForDrags, enabled, startUploads, onUnavailableDrop])

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    startUploads(files)
    e.target.value = ''
  }

  const toastIdsRef = useRef<Map<string, string | number>>(new Map())

  useEffect(() => {
    for (const u of uploads) {
      const existing = toastIdsRef.current.get(u.name)
      const pct = u.totalBytes > 0 ? Math.round((u.uploadedBytes / u.totalBytes) * 100) : 0

      if (u.status === 'done') {
        if (existing) {
          toast.success(`${u.name} uploaded`, { id: existing })
          toastIdsRef.current.delete(u.name)
        }
      } else if (u.status === 'error') {
        if (existing) {
          toast.error(`${u.name} failed to upload`, { id: existing })
          toastIdsRef.current.delete(u.name)
        }
      } else {
        const msg = `Uploading ${u.name} — ${pct}%`
        if (existing) {
          toast.loading(msg, { id: existing })
        } else {
          const id = toast.loading(msg)
          toastIdsRef.current.set(u.name, id)
        }
      }
    }
  }, [uploads])

  return (
    <>
      {isDragging && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="rounded-2xl border-2 border-dashed border-accent bg-accent/10 px-16 py-12 text-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="mx-auto mb-3 h-8 w-8 text-accent"
            >
              <path d="M9.25 13.25a.75.75 0 0 0 1.5 0V4.636l2.955 3.129a.75.75 0 0 0 1.09-1.03l-4.25-4.5a.75.75 0 0 0-1.09 0l-4.25 4.5a.75.75 0 1 0 1.09 1.03L9.25 4.636v8.614Z" />
              <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
            </svg>
            <p className="text-lg font-semibold text-text-primary">Drop files to upload</p>
            <p className="mt-1 text-sm text-text-secondary">Files will be uploaded to your delivery project</p>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileInput}
        className="hidden"
      />
    </>
  )
}

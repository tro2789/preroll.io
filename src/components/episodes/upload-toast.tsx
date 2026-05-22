'use client'

import { CircleCheckIcon, OctagonXIcon, FileVideoIcon, FileAudioIcon, FileIcon, Loader2Icon } from 'lucide-react'
import { Progress } from '@/components/ui/progress'

interface UploadToastProps {
  name: string
  totalBytes: number
  uploadedBytes: number
  status: 'uploading' | 'done' | 'error'
  error?: string
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

function fileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  const videoExts = ['mp4', 'mov', 'avi', 'mkv', 'webm', 'wmv', 'flv', 'm4v']
  const audioExts = ['mp3', 'wav', 'aac', 'flac', 'ogg', 'm4a', 'wma', 'aiff']
  if (videoExts.includes(ext)) return <FileVideoIcon className="size-5 shrink-0 text-accent" />
  if (audioExts.includes(ext)) return <FileAudioIcon className="size-5 shrink-0 text-accent" />
  return <FileIcon className="size-5 shrink-0 text-text-secondary" />
}

export function UploadToast({ name, totalBytes, uploadedBytes, status, error }: UploadToastProps) {
  const pct = totalBytes > 0 ? Math.round((uploadedBytes / totalBytes) * 100) : 0
  const shortName = name.length > 35 ? name.slice(0, 32) + '...' : name

  if (status === 'done') {
    return (
      <div className="flex items-center gap-3 w-[356px]">
        <CircleCheckIcon className="size-5 shrink-0 text-success" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-text-primary truncate">{shortName}</p>
          <p className="text-xs text-text-secondary mt-0.5">Upload complete</p>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="flex items-center gap-3 w-[356px]">
        <OctagonXIcon className="size-5 shrink-0 text-error" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-text-primary truncate">{shortName}</p>
          <p className="text-xs text-error mt-0.5">{error || 'Upload failed'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-3 w-[356px]">
      <Loader2Icon className="size-5 shrink-0 text-accent animate-spin mt-0.5" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-text-primary truncate">{shortName}</p>
          <span className="text-xs tabular-nums text-text-secondary shrink-0">{pct}%</span>
        </div>
        <Progress value={pct} className="mt-1.5 [&_[data-slot=progress-track]]:h-1.5 [&_[data-slot=progress-indicator]]:bg-accent" />
        <p className="text-xs text-text-secondary mt-1">
          {formatBytes(uploadedBytes)} / {formatBytes(totalBytes)}
        </p>
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface FileReference {
  id: string
  name: string
  external_url: string | null
  thumbnail_url: string | null
  provider: string
  provider_metadata: Record<string, unknown> | null
  updated_at: string
}

interface LinkedFileBadgeProps {
  file: FileReference
  showUnlink?: boolean
}

const labelColors: Record<string, { bg: string; text: string }> = {
  approved: { bg: 'bg-emerald-500/15', text: 'text-emerald-400' },
  in_progress: { bg: 'bg-blue-500/15', text: 'text-blue-400' },
  needs_review: { bg: 'bg-amber-500/15', text: 'text-amber-400' },
  none: { bg: 'bg-text-tertiary/20', text: 'text-text-tertiary' },
}

export function LinkedFileBadge({ file, showUnlink = true }: LinkedFileBadgeProps) {
  const router = useRouter()
  const [unlinking, setUnlinking] = useState(false)
  const label = (file.provider_metadata?.label as string) || 'none'
  const commentCount = (file.provider_metadata?.comment_count as number) || 0
  const colors = labelColors[label] || labelColors.none

  async function handleUnlink() {
    setUnlinking(true)
    await fetch(`/api/v1/integrations/file-references/${file.id}`, { method: 'DELETE' })
    setUnlinking(false)
    router.refresh()
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border-subtle bg-surface-raised p-3">
      {file.thumbnail_url ? (
        <img src={file.thumbnail_url} alt="" className="w-12 h-8 rounded object-cover shrink-0" />
      ) : (
        <div className="w-12 h-8 rounded bg-surface-overlay flex items-center justify-center shrink-0">
          <span className="text-text-tertiary text-xs">F.io</span>
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="text-sm text-text-primary truncate">{file.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
            {label === 'none' ? 'No status' : label.replace('_', ' ')}
          </span>
          {commentCount > 0 && (
            <span className="text-xs text-text-tertiary">{commentCount} comment{commentCount !== 1 ? 's' : ''}</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {file.external_url && (
          <a
            href={file.external_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-accent hover:text-accent-hover transition-colors"
          >
            Open
          </a>
        )}
        {showUnlink && (
          <button
            onClick={handleUnlink}
            disabled={unlinking}
            className="text-xs text-text-tertiary hover:text-red-400 transition-colors disabled:opacity-50"
          >
            {unlinking ? '...' : 'Unlink'}
          </button>
        )}
      </div>
    </div>
  )
}

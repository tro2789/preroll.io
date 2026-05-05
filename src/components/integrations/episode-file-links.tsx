'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FilePickerModal } from './file-picker-modal'
import { LinkedFileBadge } from './linked-file-badge'

interface FileReference {
  id: string
  name: string
  external_id: string
  external_url: string | null
  thumbnail_url: string | null
  provider: string
  provider_metadata: Record<string, unknown> | null
  updated_at: string
}

interface EpisodeFileLinksProps {
  episodeId: string
  showId: string
  fileReferences: FileReference[]
  hasFrameIo: boolean
}

export function EpisodeFileLinks({ episodeId, showId, fileReferences, hasFrameIo }: EpisodeFileLinksProps) {
  const router = useRouter()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [creatingShare, setCreatingShare] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (fileReferences.length === 0) return
    const refreshRefs = async () => {
      await Promise.allSettled(
        fileReferences.map((ref) =>
          fetch(`/api/v1/integrations/file-references/${ref.id}?refresh=true`)
        )
      )
      router.refresh()
    }
    refreshRefs()
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') refreshRefs()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleFileSelected(item: { id: string; name: string; thumbnailUrl?: string; metadata?: Record<string, unknown> }) {
    await fetch('/api/v1/integrations/file-references', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'frame_io',
        external_id: item.id,
        name: item.name,
        thumbnail_url: item.thumbnailUrl || null,
        provider_metadata: item.metadata || null,
        episode_id: episodeId,
      }),
    })
    router.refresh()
  }

  async function handleCreateShare() {
    const frameIoRefs = fileReferences.filter((r) => r.provider === 'frame_io')
    if (frameIoRefs.length === 0) return

    setCreatingShare(true)
    const res = await fetch('/api/v1/integrations/frame_io/review-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        asset_ids: frameIoRefs.map((r) => r.external_id),
        name: `Review - ${frameIoRefs.map((r) => r.name).join(', ')}`,
      }),
    })
    const json = await res.json()
    if (json.data?.url) {
      setShareUrl(json.data.url)
    }
    setCreatingShare(false)
  }

  function handleCopyShare() {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (!hasFrameIo && fileReferences.length === 0) return null

  const frameIoCount = fileReferences.filter((r) => r.provider === 'frame_io').length

  return (
    <div className="rounded-lg border border-border-subtle bg-surface-raised p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
          Linked Files
          {fileReferences.length > 0 && (
            <span className="ml-1 normal-case tracking-normal">({fileReferences.length})</span>
          )}
        </h3>
        <div className="flex items-center gap-3">
          {frameIoCount > 0 && (
            <button
              onClick={handleCreateShare}
              disabled={creatingShare}
              className="text-xs text-text-secondary hover:text-accent transition-colors font-medium disabled:opacity-50"
            >
              {creatingShare ? 'Creating...' : 'Create Review Link'}
            </button>
          )}
          {hasFrameIo && (
            <button
              onClick={() => setPickerOpen(true)}
              className="text-xs text-accent hover:text-accent-hover transition-colors font-medium"
            >
              + Link Frame.io Asset
            </button>
          )}
        </div>
      </div>

      {shareUrl && (
        <div className="flex items-center gap-2 rounded-md bg-accent/5 border border-accent/20 px-3 py-2">
          <input
            type="text"
            readOnly
            value={shareUrl}
            className="flex-1 bg-transparent text-xs text-text-primary focus:outline-none"
          />
          <button
            onClick={handleCopyShare}
            className="shrink-0 text-xs text-accent hover:text-accent-hover font-medium"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      )}

      {fileReferences.length > 0 && (
        <div className="space-y-2">
          {fileReferences.map((ref) => (
            <LinkedFileBadge key={ref.id} file={ref} />
          ))}
        </div>
      )}

      {fileReferences.length === 0 && (
        <p className="text-xs text-text-tertiary text-center py-2">
          No files linked yet.
        </p>
      )}

      <FilePickerModal
        provider="frame_io"
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handleFileSelected}
      />
    </div>
  )
}

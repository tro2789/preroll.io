'use client'

import { useState } from 'react'
import Link from 'next/link'
import { EpisodeAssets } from './episode-assets'

interface EpisodeSidebarProps {
  episodeId: string
  showId: string
  stage: string | null
  scheduledPublishDate: string | null
  publishedAt: string | null
  description: string | null
  notes: string | null
  imageUrl: string | null
  client: {
    id: string
    name: string
    email: string | null
    invite_code: string | null
    onboarded_at: string | null
  } | null
}

export function EpisodeSidebar({
  episodeId, showId, stage, scheduledPublishDate, publishedAt,
  description, notes, imageUrl, client,
}: EpisodeSidebarProps) {
  const [copied, setCopied] = useState(false)
  const [sending, setSending] = useState(false)

  const shareUrl = client?.invite_code
    ? `${window.location.origin}/share/${client.invite_code}`
    : null

  const handleSendLink = async () => {
    if (!client?.id) return
    setSending(true)
    try {
      await fetch('/api/v1/portal/send-login-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: client.id }),
      })
    } finally {
      setSending(false)
    }
  }

  return (
    <aside className="space-y-5 lg:sticky lg:top-4 lg:self-start">
      {/* Episode metadata */}
      <div className="space-y-3">
        {stage && (
          <div>
            <h4 className="text-xs font-medium text-text-tertiary">Stage</h4>
            <p className="mt-0.5 text-sm text-text-primary">{stage}</p>
          </div>
        )}
        {scheduledPublishDate && (
          <div>
            <h4 className="text-xs font-medium text-text-tertiary">Publish Date</h4>
            <p className="mt-0.5 text-sm text-text-primary">{scheduledPublishDate}</p>
          </div>
        )}
        {publishedAt && (
          <div>
            <h4 className="text-xs font-medium text-text-tertiary">Published</h4>
            <p className="mt-0.5 text-sm text-text-primary">
              {new Date(publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
        )}
      </div>

      {/* Thumbnail */}
      {imageUrl && (
        <>
          <div className="border-t border-border-subtle" />
          <div>
            <h4 className="text-xs font-medium text-text-tertiary mb-2">Thumbnail</h4>
            <img
              src={imageUrl}
              alt="Episode thumbnail"
              className="w-full rounded-md border border-border-subtle"
            />
          </div>
        </>
      )}

      {/* Description & Notes preview */}
      {(description || notes) && (
        <>
          <div className="border-t border-border-subtle" />
          <div className="space-y-3">
            {description && (
              <div>
                <h4 className="text-xs font-medium text-text-tertiary">Description</h4>
                <p className="mt-1 text-xs text-text-secondary leading-relaxed whitespace-pre-wrap line-clamp-4">{description}</p>
              </div>
            )}
            {notes && (
              <div>
                <h4 className="text-xs font-medium text-text-tertiary">Notes</h4>
                <p className="mt-1 text-xs text-text-secondary leading-relaxed whitespace-pre-wrap line-clamp-4">{notes}</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Client Portal */}
      {client && (
        <>
          <div className="border-t border-border-subtle" />
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-medium text-text-tertiary">Client Portal</h4>
              <span className={`text-xs font-medium ${client.onboarded_at ? 'text-emerald-400' : 'text-amber-400'}`}>
                {client.onboarded_at ? 'Active' : 'Pending'}
              </span>
            </div>
            <p className="text-xs text-text-secondary">{client.name}</p>
            {shareUrl && (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="flex-1 rounded border border-border-subtle bg-surface-default px-2 py-1 text-xs text-text-tertiary truncate"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(shareUrl)
                    setCopied(true)
                    setTimeout(() => setCopied(false), 2000)
                  }}
                  className="shrink-0 rounded border border-border-subtle px-2 py-1 text-xs text-text-tertiary hover:text-text-primary transition-colors"
                >
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            )}
            <div className="flex items-center gap-2">
              <button
                onClick={handleSendLink}
                disabled={sending}
                className="text-xs text-accent hover:text-accent-hover transition-colors disabled:opacity-50"
              >
                {sending ? 'Sending...' : 'Send link'}
              </button>
              <Link
                href={`/portal?preview=${client.id}`}
                target="_blank"
                className="text-xs text-text-tertiary hover:text-text-secondary transition-colors"
              >
                Preview
              </Link>
            </div>
          </div>
        </>
      )}

      {/* Assets */}
      <div className="border-t border-border-subtle" />
      <EpisodeAssets episodeId={episodeId} />
    </aside>
  )
}

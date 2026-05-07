'use client'

import { useState, useRef, useEffect } from 'react'

interface Comment {
  id: string
  author_name: string
  text: string
  timestamp_secs: number | null
  is_external: boolean
  created_at: string
}

interface CommentsSidebarProps {
  comments: Comment[]
  currentTime: number
  onSeek: (seconds: number) => void
  onSubmit: (text: string, timestampSecs: number) => Promise<void>
}

function formatTimecode(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffSecs = Math.floor((now - then) / 1000)

  if (diffSecs < 60) return 'just now'
  const diffMins = Math.floor(diffSecs / 60)
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d ago`
}

function CommentItem({
  comment,
  currentTime,
  onSeek,
}: {
  comment: Comment
  currentTime: number
  onSeek: (seconds: number) => void
}) {
  const isActive =
    comment.timestamp_secs !== null &&
    Math.abs(currentTime - comment.timestamp_secs) < 2

  return (
    <div
      className={`px-3 py-2.5 rounded-md transition-colors ${isActive ? 'bg-accent/10' : ''}`}
    >
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-xs font-medium text-text-primary">
          {comment.author_name}
        </span>
        {comment.is_external && (
          <span className="text-[10px] bg-surface-overlay border border-border-subtle rounded px-1 text-text-tertiary">
            Editor
          </span>
        )}
        {comment.timestamp_secs !== null && (
          <button
            type="button"
            onClick={() => onSeek(comment.timestamp_secs!)}
            className="text-[11px] font-mono bg-surface-overlay border border-border-subtle rounded px-1.5 py-0.5 text-accent hover:bg-accent/10 transition-colors"
          >
            {formatTimecode(comment.timestamp_secs)}
          </button>
        )}
        <span className="ml-auto text-[10px] text-text-tertiary">
          {timeAgo(comment.created_at)}
        </span>
      </div>
      <p className="text-sm text-text-secondary mt-1">{comment.text}</p>
    </div>
  )
}

export function CommentsSidebar({
  comments,
  currentTime,
  onSeek,
  onSubmit,
}: CommentsSidebarProps) {
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  const generalComments = comments.filter((c) => c.timestamp_secs === null)
  const timedComments = [...comments]
    .filter((c) => c.timestamp_secs !== null)
    .sort((a, b) => a.timestamp_secs! - b.timestamp_secs!)

  // Auto-scroll to active comment
  useEffect(() => {
    if (!listRef.current) return
    const activeEl = listRef.current.querySelector('[data-active="true"]')
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [currentTime])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed) return

    setSubmitting(true)
    try {
      await onSubmit(trimmed, currentTime)
      setText('')
    } finally {
      setSubmitting(false)
    }
  }

  const hasComments = comments.length > 0

  return (
    <div className="flex flex-col h-full">
      {/* Comment list */}
      <div ref={listRef} className="flex-1 overflow-y-auto">
        {!hasComments ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <p className="text-sm text-text-secondary">No comments yet</p>
            <p className="text-xs text-text-tertiary mt-1">
              Add a timecoded comment to start the conversation.
            </p>
          </div>
        ) : (
          <div className="space-y-1 py-2">
            {generalComments.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-text-tertiary px-3 pt-1 pb-1.5">
                  General
                </p>
                {generalComments.map((c) => (
                  <CommentItem
                    key={c.id}
                    comment={c}
                    currentTime={currentTime}
                    onSeek={onSeek}
                  />
                ))}
              </div>
            )}

            {timedComments.length > 0 && generalComments.length > 0 && (
              <div className="border-t border-border-subtle mx-3 my-1" />
            )}

            {timedComments.map((c) => {
              const isActive =
                c.timestamp_secs !== null &&
                Math.abs(currentTime - c.timestamp_secs) < 2
              return (
                <div key={c.id} data-active={isActive ? 'true' : undefined}>
                  <CommentItem
                    comment={c}
                    currentTime={currentTime}
                    onSeek={onSeek}
                  />
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Comment input */}
      <div className="shrink-0 border-t border-border-subtle pt-3 mt-3 px-3 pb-3">
        <p className="text-xs text-text-tertiary mb-2">
          Commenting at{' '}
          <span className="font-mono text-accent bg-surface-overlay border border-border-subtle rounded px-1.5 py-0.5">
            {formatTimecode(currentTime)}
          </span>
        </p>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add a comment..."
            disabled={submitting}
            className="flex-1 rounded-md border border-border-default bg-surface-input px-3 py-1.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={submitting || !text.trim()}
            className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
          >
            {submitting ? 'Sending...' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  )
}

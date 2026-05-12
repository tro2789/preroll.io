'use client'

import { useState } from 'react'

interface Segment {
  start: number
  end: number
  text: string
  speaker: number
}

interface TranscriptViewerProps {
  segments: Segment[]
  fullText: string
  speakerCount: number
  wordCount: number
}

function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${String(secs).padStart(2, '0')}`
}

const SPEAKER_COLORS = [
  'text-sky-400',
  'text-violet-400',
  'text-amber-400',
  'text-emerald-400',
  'text-rose-400',
  'text-cyan-400',
]

export function TranscriptViewer({ segments, fullText, speakerCount, wordCount }: TranscriptViewerProps) {
  const [expanded, setExpanded] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredSegments = searchQuery
    ? segments.filter(s => s.text.toLowerCase().includes(searchQuery.toLowerCase()))
    : segments

  const displaySegments = expanded ? filteredSegments : filteredSegments.slice(0, 10)

  return (
    <div className="space-y-3">
      {segments.length > 10 && (
        <input
          type="text"
          placeholder="Search transcript..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-md border border-border-subtle bg-surface-default px-3 py-1.5 text-xs text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
        />
      )}

      <div className="space-y-1.5 max-h-96 overflow-y-auto">
        {displaySegments.map((segment, i) => (
          <div key={i} className="flex gap-2 text-sm">
            <span className="shrink-0 w-12 text-xs text-text-secondary tabular-nums pt-0.5">
              {formatTimestamp(segment.start)}
            </span>
            {speakerCount > 1 && (
              <span className={`shrink-0 text-xs font-medium pt-0.5 ${SPEAKER_COLORS[segment.speaker % SPEAKER_COLORS.length]}`}>
                S{segment.speaker + 1}
              </span>
            )}
            <span className="text-text-secondary text-xs leading-relaxed">{segment.text}</span>
          </div>
        ))}
      </div>

      {filteredSegments.length > 10 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-accent hover:text-accent-hover transition-colors"
        >
          {expanded ? 'Show less' : `Show all ${filteredSegments.length} segments`}
        </button>
      )}
    </div>
  )
}

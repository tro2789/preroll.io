'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TranscriptViewer } from './transcript-viewer'

interface AiPanelProps {
  episodeId: string
  showId: string
  hasAudioFiles: boolean
}

interface Transcription {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  full_text: string | null
  segments: Array<{ start: number; end: number; text: string; speaker: number }> | null
  speaker_count: number | null
  word_count: number | null
  error_message: string | null
  created_at: string
}

interface AddonStatus {
  addon: { enabled: boolean; credits_balance: number }
  selfHosted: boolean
}

type GenerationType = 'show_notes' | 'description' | 'social_twitter' | 'social_linkedin' | 'social_instagram' | 'title_suggestions'

const GENERATION_LABELS: Record<GenerationType, string> = {
  show_notes: 'Show Notes',
  description: 'Description',
  social_twitter: 'X / Twitter',
  social_linkedin: 'LinkedIn',
  social_instagram: 'Instagram',
  title_suggestions: 'Title Ideas',
}

export function AiPanel({ episodeId, showId, hasAudioFiles }: AiPanelProps) {
  const [addon, setAddon] = useState<AddonStatus | null>(null)
  const [transcription, setTranscription] = useState<Transcription | null>(null)
  const [loading, setLoading] = useState(true)
  const [transcribing, setTranscribing] = useState(false)
  const [generating, setGenerating] = useState<GenerationType | null>(null)
  const [generatedContent, setGeneratedContent] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const [addonRes, transcriptionRes] = await Promise.all([
        fetch('/api/v1/ai/addon'),
        fetch(`/api/v1/episodes/${episodeId}/transcription`),
      ])

      if (addonRes.ok) {
        const addonData = await addonRes.json()
        setAddon(addonData.data)
      }

      if (transcriptionRes.ok) {
        const transcriptionData = await transcriptionRes.json()
        setTranscription(transcriptionData.data.transcription)
      }
    } finally {
      setLoading(false)
    }
  }, [episodeId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`transcriptions:${episodeId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'transcriptions',
          filter: `episode_id=eq.${episodeId}`,
        },
        (payload) => {
          const updated = payload.new as unknown as Transcription
          setTranscription(updated)
          if (updated.status === 'completed' || updated.status === 'failed') {
            setTranscribing(false)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [episodeId])

  const handleTranscribe = async (audioUrl: string, sourceType: string, sourceRef: string, durationSeconds?: number) => {
    setTranscribing(true)
    setError(null)

    try {
      const res = await fetch(`/api/v1/episodes/${episodeId}/transcribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_type: sourceType,
          source_ref: sourceRef,
          audio_url: audioUrl,
          duration_seconds: durationSeconds,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Transcription failed')
        setTranscribing(false)
        return
      }

      setTranscription(data.data)
    } catch {
      setError('Failed to start transcription')
      setTranscribing(false)
    }
  }

  const handleGenerate = async (type: GenerationType) => {
    setGenerating(type)
    setError(null)

    try {
      const res = await fetch(`/api/v1/episodes/${episodeId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Generation failed')
        return
      }

      setGeneratedContent(prev => ({ ...prev, [type]: data.data.generation.result }))
    } finally {
      setGenerating(null)
    }
  }

  const handleApply = async (type: GenerationType) => {
    const content = generatedContent[type]
    if (!content) return

    const field = type === 'show_notes' ? 'notes' : type === 'description' ? 'description' : null
    if (!field) return

    await fetch(`/api/v1/shows/${showId}/episodes/${episodeId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: content }),
    })
  }

  if (loading) return null

  if (!addon?.addon.enabled) {
    return (
      <div className="rounded-lg border border-border-subtle bg-surface-raised p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-text-primary">AI Assistant</h3>
            <p className="mt-1 text-xs text-text-tertiary">
              Transcribe episodes and generate show notes, descriptions, and social copy with AI.
            </p>
          </div>
          <a
            href="/app/settings/ai"
            className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover transition-colors"
          >
            Enable AI
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border-subtle bg-surface-raised">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-center justify-between p-4"
      >
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-text-primary">AI Assistant</h3>
          {transcription?.status === 'completed' && (
            <span className="rounded-full bg-emerald-500/15 text-emerald-400 px-2 py-0.5 text-xs">
              Transcript ready
            </span>
          )}
          {(transcription?.status === 'pending' || transcription?.status === 'processing') && (
            <span className="rounded-full bg-amber-500/15 text-amber-400 px-2 py-0.5 text-xs">
              Transcribing...
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {!addon.selfHosted && (
            <span className="text-xs text-text-tertiary">
              {addon.addon.credits_balance} credits
            </span>
          )}
          <svg
            className={`h-4 w-4 text-text-tertiary transition-transform ${collapsed ? '' : 'rotate-180'}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {!collapsed && (
        <div className="border-t border-border-subtle p-4 space-y-4">
          {error && (
            <div className="rounded-md bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400">
              {error}
            </div>
          )}

          {/* Transcription Section */}
          {!transcription || transcription.status === 'failed' ? (
            <div>
              {transcription?.status === 'failed' && (
                <p className="text-xs text-red-400 mb-2">
                  Previous transcription failed: {transcription.error_message}
                </p>
              )}
              <TranscribeButton
                episodeId={episodeId}
                transcribing={transcribing}
                hasAudioFiles={hasAudioFiles}
                onTranscribe={handleTranscribe}
              />
            </div>
          ) : transcription.status === 'pending' || transcription.status === 'processing' ? (
            <div className="flex items-center gap-3 py-4">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
              <span className="text-sm text-text-secondary">Transcribing episode audio...</span>
            </div>
          ) : transcription.status === 'completed' && transcription.full_text ? (
            <>
              <TranscriptViewer
                segments={transcription.segments || []}
                fullText={transcription.full_text}
                speakerCount={transcription.speaker_count || 0}
                wordCount={transcription.word_count || 0}
              />

              {/* Generation Buttons */}
              <div className="border-t border-border-subtle pt-4">
                <p className="text-xs text-text-tertiary mb-3">Generate from transcript:</p>
                <div className="flex flex-wrap gap-2">
                  {(Object.entries(GENERATION_LABELS) as [GenerationType, string][]).map(([type, label]) => (
                    <button
                      key={type}
                      onClick={() => handleGenerate(type)}
                      disabled={generating !== null}
                      className="rounded-md border border-border-subtle bg-surface-default px-3 py-1.5 text-xs font-medium text-text-primary hover:border-accent hover:text-accent transition-colors disabled:opacity-50"
                    >
                      {generating === type ? 'Generating...' : label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Generated Content */}
              {Object.entries(generatedContent).map(([type, content]) => (
                <GeneratedResult
                  key={type}
                  type={type as GenerationType}
                  content={content}
                  onApply={() => handleApply(type as GenerationType)}
                  onCopy={() => navigator.clipboard.writeText(content)}
                  onRegenerate={() => handleGenerate(type as GenerationType)}
                />
              ))}
            </>
          ) : null}
        </div>
      )}
    </div>
  )
}

function TranscribeButton({
  episodeId,
  transcribing,
  hasAudioFiles,
  onTranscribe,
}: {
  episodeId: string
  transcribing: boolean
  hasAudioFiles: boolean
  onTranscribe: (audioUrl: string, sourceType: string, sourceRef: string, durationSeconds?: number) => void
}) {
  const [showUrlInput, setShowUrlInput] = useState(false)
  const [url, setUrl] = useState('')

  if (!hasAudioFiles && !showUrlInput) {
    return (
      <div className="space-y-2">
        <p className="text-xs text-text-tertiary">No audio files detected. Paste an audio URL to transcribe:</p>
        <button
          onClick={() => setShowUrlInput(true)}
          className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover transition-colors"
        >
          Transcribe from URL
        </button>
      </div>
    )
  }

  if (showUrlInput || !hasAudioFiles) {
    return (
      <div className="flex gap-2">
        <input
          type="url"
          placeholder="https://example.com/episode.mp3"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="flex-1 rounded-md border border-border-subtle bg-surface-default px-3 py-1.5 text-xs text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
        />
        <button
          onClick={() => {
            if (url) onTranscribe(url, 'url', url)
          }}
          disabled={!url || transcribing}
          className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
        >
          {transcribing ? 'Starting...' : 'Transcribe'}
        </button>
      </div>
    )
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={() => {
          fetch(`/api/v1/episodes/${episodeId}/delivery/files`)
            .then(r => r.json())
            .then(data => {
              const files = data.data?.files || []
              const audioFile = files.find((f: { mime_type?: string }) =>
                f.mime_type?.startsWith('audio/') || f.mime_type?.startsWith('video/')
              )
              if (audioFile) {
                onTranscribe(
                  audioFile.download_url || audioFile.view_url,
                  'file_reference',
                  audioFile.external_id,
                  audioFile.duration_seconds
                )
              }
            })
        }}
        disabled={transcribing}
        className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
      >
        {transcribing ? 'Starting...' : 'Transcribe Episode'}
      </button>
      <button
        onClick={() => setShowUrlInput(true)}
        className="rounded-md border border-border-subtle bg-surface-default px-3 py-1.5 text-xs font-medium text-text-secondary hover:border-border-hover transition-colors"
      >
        From URL
      </button>
    </div>
  )
}

function GeneratedResult({
  type,
  content,
  onApply,
  onCopy,
  onRegenerate,
}: {
  type: GenerationType
  content: string
  onApply: () => void
  onCopy: () => void
  onRegenerate: () => void
}) {
  const canApply = type === 'show_notes' || type === 'description'
  const [applied, setApplied] = useState(false)
  const [copied, setCopied] = useState(false)

  return (
    <div className="rounded-md border border-border-subtle bg-surface-default p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-text-primary">{GENERATION_LABELS[type]}</span>
        <div className="flex items-center gap-2">
          {canApply && (
            <button
              onClick={() => { onApply(); setApplied(true); setTimeout(() => setApplied(false), 2000) }}
              className="text-xs text-accent hover:text-accent-hover transition-colors"
            >
              {applied ? 'Applied!' : 'Apply to Episode'}
            </button>
          )}
          <button
            onClick={() => { onCopy(); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
            className="text-xs text-text-tertiary hover:text-text-secondary transition-colors"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <button
            onClick={onRegenerate}
            className="text-xs text-text-tertiary hover:text-text-secondary transition-colors"
          >
            Regenerate
          </button>
        </div>
      </div>
      <div className="text-xs text-text-secondary whitespace-pre-wrap leading-relaxed">
        {content}
      </div>
    </div>
  )
}

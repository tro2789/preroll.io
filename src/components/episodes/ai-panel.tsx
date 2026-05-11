'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TranscriptViewer } from './transcript-viewer'
import { type GenerationType, ALL_GENERATION_TYPES, GENERATION_LABELS } from '@/lib/ai/constants'

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
  addon: {
    enabled: boolean
    credits_balance: number
    monthly_allowance: number
    monthly_used: number
    monthly_remaining: number
    cycle_reset_at: string | null
  }
  selfHosted: boolean
}

interface PipelineJob {
  id: string
  status: 'pending' | 'transcribing' | 'generating' | 'completed' | 'failed' | 'skipped' | 'partial'
  trigger_source: string
  error_message: string | null
  skipped_reason: string | null
  created_at: string
  completed_at: string | null
}

interface Generation {
  id: string
  generation_type: string
  result: string
  credits_consumed: number
  created_at: string
}

const GENERATION_ORDER = ALL_GENERATION_TYPES

export function AiPanel({ episodeId, showId, hasAudioFiles }: AiPanelProps) {
  const [addon, setAddon] = useState<AddonStatus | null>(null)
  const [transcription, setTranscription] = useState<Transcription | null>(null)
  const [pipeline, setPipeline] = useState<PipelineJob | null>(null)
  const [generations, setGenerations] = useState<Generation[]>([])
  const [loading, setLoading] = useState(true)
  const [transcribing, setTranscribing] = useState(false)
  const [generating, setGenerating] = useState<GenerationType | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const [addonRes, transcriptionRes, pipelineRes] = await Promise.all([
        fetch('/api/v1/ai/addon'),
        fetch(`/api/v1/episodes/${episodeId}/transcription`),
        fetch(`/api/v1/episodes/${episodeId}/pipeline`),
      ])

      if (addonRes.ok) {
        const addonData = await addonRes.json()
        setAddon(addonData.data)
      }

      if (transcriptionRes.ok) {
        const transcriptionData = await transcriptionRes.json()
        setTranscription(transcriptionData.data.transcription)
      }

      if (pipelineRes.ok) {
        const pipelineData = await pipelineRes.json()
        setPipeline(pipelineData.data.pipeline)
        setGenerations(pipelineData.data.generations || [])
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
      .channel(`ai:${episodeId}`)
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
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ai_pipeline_jobs',
          filter: `episode_id=eq.${episodeId}`,
        },
        (payload) => {
          const updated = payload.new as unknown as PipelineJob
          setPipeline(updated)
          if (updated.status === 'completed' || updated.status === 'partial') {
            fetchData()
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ai_generations',
          filter: `episode_id=eq.${episodeId}`,
        },
        (payload) => {
          const gen = payload.new as unknown as Generation
          setGenerations(prev => [gen, ...prev])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [episodeId, fetchData])

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

      setGenerations(prev => [{
        id: data.data.generation.id,
        generation_type: type,
        result: data.data.generation.result,
        credits_consumed: data.data.generation.credits_consumed,
        created_at: new Date().toISOString(),
      }, ...prev])
    } finally {
      setGenerating(null)
    }
  }

  const handleApply = async (type: GenerationType, content: string) => {
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
            <p className="mt-1 text-xs text-text-secondary">
              Upgrade to Pro or Studio to auto-transcribe episodes and generate show notes, descriptions, and social copy.
            </p>
          </div>
          <a
            href="/app/settings/billing"
            className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover transition-colors"
          >
            Upgrade
          </a>
        </div>
      </div>
    )
  }

  const totalAvailable = addon.selfHosted
    ? Infinity
    : addon.addon.monthly_remaining + addon.addon.credits_balance

  const isRunning = pipeline?.status === 'transcribing' || pipeline?.status === 'generating' || pipeline?.status === 'pending'
  const hasTranscript = transcription?.status === 'completed' && transcription.full_text
  const isTranscribing = transcribing || transcription?.status === 'pending' || transcription?.status === 'processing'

  const latestGenByType = new Map<string, Generation>()
  for (const g of generations) {
    if (!latestGenByType.has(g.generation_type)) {
      latestGenByType.set(g.generation_type, g)
    }
  }

  return (
    <div className="rounded-lg border border-border-subtle bg-surface-raised">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-center justify-between p-4"
      >
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-text-primary">AI Assistant</h3>
          {isRunning && (
            <span className="flex items-center gap-1.5 rounded-full bg-amber-500/15 text-amber-400 px-2 py-0.5 text-xs">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
              Processing
            </span>
          )}
          {pipeline?.status === 'completed' && (
            <span className="rounded-full bg-emerald-500/15 text-emerald-400 px-2 py-0.5 text-xs">
              Complete
            </span>
          )}
          {pipeline?.status === 'partial' && (
            <span className="rounded-full bg-amber-500/15 text-amber-400 px-2 py-0.5 text-xs">
              Partial
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {!addon.selfHosted && (
            <span className="text-xs text-text-secondary tabular-nums">
              {addon.addon.monthly_remaining}/{addon.addon.monthly_allowance}
              {addon.addon.credits_balance > 0 && (
                <> + {addon.addon.credits_balance}</>
              )}
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

          {/* No audio yet or waiting for processing */}
          {!hasTranscript && !isTranscribing && !isRunning && (
            <div className="space-y-3">
              {hasAudioFiles ? (
                <div className="flex items-center gap-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                    <p className="text-xs text-text-secondary">
                      Waiting for audio to finish processing. AI transcription and content generation will start automatically.
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-text-secondary">
                  Upload or link audio to this episode to automatically generate show notes, descriptions, and social posts.
                </p>
              )}
              <TranscribeButton
                episodeId={episodeId}
                transcribing={transcribing}
                hasAudioFiles={hasAudioFiles}
                onTranscribe={handleTranscribe}
              />
            </div>
          )}

          {/* Pipeline status steps */}
          {(isTranscribing || hasTranscript || isRunning) && (
            <div className="space-y-3">
              {/* Transcription step */}
              <PipelineStep
                label="Transcription"
                status={
                  hasTranscript ? 'completed'
                    : transcription?.status === 'failed' ? 'failed'
                    : isTranscribing ? 'running'
                    : 'queued'
                }
                detail={
                  hasTranscript
                    ? `${transcription!.word_count?.toLocaleString()} words · ${transcription!.speaker_count} speaker${transcription!.speaker_count !== 1 ? 's' : ''}`
                    : transcription?.status === 'failed'
                    ? transcription.error_message || 'Failed'
                    : undefined
                }
              />

              {/* Generation steps */}
              {hasTranscript && GENERATION_ORDER.map((type) => {
                const gen = latestGenByType.get(type)
                const isGenerating = pipeline?.status === 'generating'
                const stepStatus: PipelineStepStatus = gen
                  ? 'completed'
                  : generating === type
                  ? 'running'
                  : isGenerating && !gen
                  ? 'queued'
                  : 'idle'

                return (
                  <PipelineStep
                    key={type}
                    label={GENERATION_LABELS[type]}
                    status={stepStatus}
                  />
                )
              })}

              {/* Transcript viewer */}
              {hasTranscript && (
                <div className="border-t border-border-subtle pt-3">
                  <TranscriptViewer
                    segments={transcription!.segments || []}
                    fullText={transcription!.full_text!}
                    speakerCount={transcription!.speaker_count || 0}
                    wordCount={transcription!.word_count || 0}
                  />
                </div>
              )}
            </div>
          )}

          {/* Failed transcription — retry */}
          {transcription?.status === 'failed' && (
            <div className="border-t border-border-subtle pt-3">
              <TranscribeButton
                episodeId={episodeId}
                transcribing={transcribing}
                hasAudioFiles={hasAudioFiles}
                onTranscribe={handleTranscribe}
              />
            </div>
          )}

          {/* Generated content cards */}
          {latestGenByType.size > 0 && (
            <div className="space-y-2">
              {GENERATION_ORDER.map((type) => {
                const gen = latestGenByType.get(type)
                if (!gen) return null
                return (
                  <GeneratedResult
                    key={gen.id}
                    type={type}
                    content={gen.result}
                    onApply={() => handleApply(type, gen.result)}
                    onCopy={() => navigator.clipboard.writeText(gen.result)}
                    onRegenerate={() => handleGenerate(type)}
                  />
                )
              })}
            </div>
          )}

          {/* Manual regenerate buttons when pipeline is done */}
          {hasTranscript && !isRunning && (
            <div className="border-t border-border-subtle pt-3">
              <p className="text-xs text-text-secondary mb-2">
                {latestGenByType.size > 0 ? 'Regenerate:' : 'Generate from transcript:'}
              </p>
              <div className="flex flex-wrap gap-2">
                {GENERATION_ORDER.map((type) => (
                  <button
                    key={type}
                    onClick={() => handleGenerate(type)}
                    disabled={generating !== null || totalAvailable < 1}
                    className="rounded-md border border-border-subtle bg-surface-default px-3 py-1.5 text-xs font-medium text-text-primary hover:border-accent hover:text-accent transition-colors disabled:opacity-50"
                  >
                    {generating === type ? 'Generating...' : GENERATION_LABELS[type]}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

type PipelineStepStatus = 'queued' | 'running' | 'completed' | 'failed' | 'idle'

const STEP_TEXT_COLOR: Record<PipelineStepStatus, string> = {
  completed: 'text-text-primary',
  running: 'text-text-primary',
  failed: 'text-red-400',
  queued: 'text-text-tertiary',
  idle: 'text-text-tertiary',
}

function PipelineStep({ label, status, detail }: {
  label: string
  status: PipelineStepStatus
  detail?: string
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-shrink-0">
        {status === 'completed' && (
          <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )}
        {status === 'running' && (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        )}
        {status === 'failed' && (
          <svg className="h-4 w-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
        {(status === 'queued' || status === 'idle') && (
          <div className={`h-4 w-4 rounded-full border-2 ${status === 'queued' ? 'border-text-tertiary' : 'border-border-subtle'}`} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <span className={`text-sm ${STEP_TEXT_COLOR[status]}`}>
          {label}
        </span>
        {detail && (
          <span className="ml-2 text-xs text-text-secondary">{detail}</span>
        )}
        {status === 'running' && (
          <span className="ml-2 text-xs text-text-secondary">Processing...</span>
        )}
      </div>
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

  if (showUrlInput || !hasAudioFiles) {
    return (
      <div className="space-y-2">
        {!hasAudioFiles && !showUrlInput && (
          <p className="text-xs text-text-secondary">No audio files detected.</p>
        )}
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
            {transcribing ? 'Starting...' : 'Go'}
          </button>
        </div>
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

'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { TranscriptViewer } from './transcript-viewer'
import { MarkdownContent } from './markdown-content'
import { formatDuration } from '@/lib/format'
import { type GenerationType, ALL_GENERATION_TYPES, GENERATION_LABELS, CREDIT_COSTS } from '@/lib/ai/constants'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

const PRODUCTION_TYPES: GenerationType[] = ['show_notes', 'description', 'title_suggestions']
const PROMOTION_TYPES: GenerationType[] = ['social_twitter', 'social_linkedin', 'social_instagram']

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

export function AiPanel({ episodeId, showId, hasAudioFiles }: AiPanelProps) {
  const [addon, setAddon] = useState<AddonStatus | null>(null)
  const [transcription, setTranscription] = useState<Transcription | null>(null)
  const [pipeline, setPipeline] = useState<PipelineJob | null>(null)
  const [generations, setGenerations] = useState<Generation[]>([])
  const [enabledTypes, setEnabledTypes] = useState<GenerationType[]>(ALL_GENERATION_TYPES)
  const [loading, setLoading] = useState(true)
  const [transcribing, setTranscribing] = useState(false)
  const [generating, setGenerating] = useState<GenerationType | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState(false)
  const [startingPipeline, setStartingPipeline] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [notification, setNotification] = useState<string | null>(null)
  const collapsedRef = useRef(collapsed)
  const router = useRouter()

  useEffect(() => { collapsedRef.current = collapsed }, [collapsed])

  const fetchData = useCallback(async () => {
    try {
      const [addonRes, transcriptionRes, pipelineRes, showRes] = await Promise.all([
        fetch('/api/v1/ai/addon'),
        fetch(`/api/v1/episodes/${episodeId}/transcription`),
        fetch(`/api/v1/episodes/${episodeId}/pipeline`),
        fetch(`/api/v1/shows/${showId}`),
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

      if (showRes.ok) {
        const showData = await showRes.json()
        const show = showData.data
        if (show?.ai_auto_generate && Array.isArray(show.ai_auto_generate) && show.ai_auto_generate.length > 0) {
          setEnabledTypes(
            show.ai_auto_generate.filter((t: string): t is GenerationType =>
              ALL_GENERATION_TYPES.includes(t as GenerationType)
            )
          )
        }
      }
    } finally {
      setLoading(false)
    }
  }, [episodeId, showId])

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
          event: '*',
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
            router.refresh()
            setNotification(
              updated.status === 'completed'
                ? 'AI content ready — review below'
                : 'AI content partially generated — some types were skipped'
            )
            setTimeout(() => setNotification(null), 8000)
            if (collapsedRef.current) setCollapsed(false)
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
  }, [episodeId, fetchData, router])

  useEffect(() => {
    const active = pipeline?.status === 'transcribing' || pipeline?.status === 'generating' || pipeline?.status === 'pending'
    if (!pipeline || !active) {
      setElapsedSeconds(0)
      return
    }
    const startTime = new Date(pipeline.created_at).getTime()
    const tick = () => setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000))
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [pipeline])

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

  const handleApply = async (type: GenerationType, content: string): Promise<boolean> => {
    const field = type === 'show_notes' ? 'notes' : type === 'description' ? 'description' : null
    if (!field) return false

    try {
      const res = await fetch(`/api/v1/shows/${showId}/episodes/${episodeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: content }),
      })

      if (!res.ok) return false
      router.refresh()
      return true
    } catch {
      return false
    }
  }

  const handleRunPipeline = async () => {
    setStartingPipeline(true)
    setError(null)
    try {
      const res = await fetch(`/api/v1/episodes/${episodeId}/pipeline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to start AI pipeline')
        return
      }
      if (data.data?.status === 'skipped') {
        setError(data.data.skippedReason === 'no_credits'
          ? 'Not enough credits to run the pipeline.'
          : data.data.skippedReason === 'disabled'
          ? 'AI is not available on your current plan.'
          : 'Pipeline was skipped.')
        return
      }
      setPipeline({ id: data.data.jobId, status: data.data.status, trigger_source: 'manual', error_message: null, skipped_reason: null, created_at: new Date().toISOString(), completed_at: null })
    } catch {
      setError('Failed to start AI pipeline')
    } finally {
      setStartingPipeline(false)
    }
  }

  const latestGenByType = useMemo(() => {
    const map = new Map<string, Generation>()
    for (const g of generations) {
      if (!map.has(g.generation_type)) {
        map.set(g.generation_type, g)
      }
    }
    return map
  }, [generations])

  const estimatedCost = useMemo(() => enabledTypes.reduce((sum, t) => sum + CREDIT_COSTS[t], 0), [enabledTypes])

  const previousByType = useMemo(() => {
    const map = new Map<string, Generation[]>()
    for (const g of generations) {
      const latest = latestGenByType.get(g.generation_type)
      if (g.id === latest?.id) continue
      const arr = map.get(g.generation_type)
      if (arr) {
        if (arr.length < 4) arr.push(g)
      } else {
        map.set(g.generation_type, [g])
      }
    }
    return map
  }, [generations, latestGenByType])

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

  let currentGenerationType: GenerationType | null = null
  if (pipeline?.status === 'generating') {
    for (const type of enabledTypes) {
      if (!latestGenByType.has(type)) {
        currentGenerationType = type
        break
      }
    }
  }

  const totalSteps = 1 + enabledTypes.length
  const completedSteps = (hasTranscript ? 1 : 0) + enabledTypes.filter(t => latestGenByType.has(t)).length
  const progressPercent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0

  return (
    <div className="rounded-lg border border-border-subtle bg-surface-raised">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-center justify-between p-3 gap-2"
        aria-expanded={!collapsed}
        aria-label={`AI Assistant${isRunning ? ' — processing' : ''}`}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-text-primary shrink-0">AI Assistant</h3>
            <span aria-live="polite" aria-atomic="true">
              {isRunning && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 text-amber-400 px-1.5 py-0.5 text-xs whitespace-nowrap">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" aria-hidden="true" />
                  {pipeline?.status === 'transcribing' || isTranscribing ? 'Transcribing' : 'Generating'}
                  {elapsedSeconds > 0 && (
                    <span className="tabular-nums opacity-70">{formatDuration(elapsedSeconds)}</span>
                  )}
                </span>
              )}
              {pipeline?.status === 'completed' && (
                <span className="rounded-full bg-emerald-500/15 text-emerald-400 px-1.5 py-0.5 text-xs">Done</span>
              )}
              {pipeline?.status === 'partial' && (
                <span className="rounded-full bg-amber-500/15 text-amber-400 px-1.5 py-0.5 text-xs">Partial</span>
              )}
            </span>
          </div>
          {!addon.selfHosted && (
            <span
              className="text-xs text-text-secondary tabular-nums"
              title={`${addon.addon.monthly_remaining} of ${addon.addon.monthly_allowance} monthly credits remaining${addon.addon.credits_balance > 0 ? `, plus ${addon.addon.credits_balance} purchased` : ''}`}
            >
              {addon.addon.monthly_remaining} monthly{addon.addon.credits_balance > 0 && <> · {addon.addon.credits_balance} purchased</>}
            </span>
          )}
        </div>
        <svg
          className={`h-4 w-4 shrink-0 text-text-tertiary transition-transform ${collapsed ? '' : 'rotate-180'}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {!collapsed && (
        <div className="border-t border-border-subtle p-4 space-y-4">
          {error && (
            <div className="rounded-md bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400">
              {error}
            </div>
          )}

          {notification && (
            <div className="rounded-md bg-accent/10 border border-accent/20 p-3 text-xs text-accent flex items-center justify-between">
              <span>{notification}</span>
              <button onClick={() => setNotification(null)} className="text-accent/60 hover:text-accent" aria-label="Dismiss">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* No audio yet or ready to run */}
          {!hasTranscript && !isTranscribing && !isRunning && (
            <div className="space-y-3">
              {hasAudioFiles ? (
                <div className="space-y-3">
                  <p className="text-xs text-text-secondary">
                    Audio detected. Run the AI pipeline to transcribe and generate show notes, descriptions, and social posts.
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleRunPipeline}
                      disabled={startingPipeline || totalAvailable < 1}
                      className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
                    >
                      {startingPipeline ? 'Starting...' : 'Run AI Pipeline'}
                    </button>
                    <span className="text-xs text-text-tertiary">~{estimatedCost} credits</span>
                    <TranscribeButton
                      episodeId={episodeId}
                      transcribing={transcribing}
                      hasAudioFiles={hasAudioFiles}
                      onTranscribe={handleTranscribe}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-text-secondary">
                    Upload or link audio to this episode to automatically generate show notes, descriptions, and social posts.
                  </p>
                  <TranscribeButton
                    episodeId={episodeId}
                    transcribing={transcribing}
                    hasAudioFiles={hasAudioFiles}
                    onTranscribe={handleTranscribe}
                  />
                </div>
              )}
            </div>
          )}

          {/* Pipeline progress — only visible while actively running */}
          {isRunning && (
            <div className="flex items-center gap-2 text-xs text-text-secondary">
              <div className="flex-1 h-1 rounded-full bg-surface-overlay overflow-hidden">
                <div
                  className="h-full rounded-full bg-accent transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="tabular-nums shrink-0">{completedSteps}/{totalSteps}</span>
            </div>
          )}

          {/* Transcription-only progress (not full pipeline) */}
          {!isRunning && (isTranscribing || transcription?.status === 'failed') && (
            <PipelineStep
              label="Transcription"
              status={transcription?.status === 'failed' ? 'failed' : 'running'}
              detail={transcription?.status === 'failed' ? (transcription.error_message || 'Failed') : undefined}
            />
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

          {/* Transcript viewer — collapsible, above generated content */}
          {hasTranscript && (
            <TranscriptSection
              segments={transcription!.segments || []}
              fullText={transcription!.full_text!}
              speakerCount={transcription!.speaker_count || 0}
              wordCount={transcription!.word_count || 0}
            />
          )}

          {/* Generated content tabs */}
          {(latestGenByType.size > 0 || (hasTranscript && !isRunning)) && (
            <GeneratedContentTabs
              latestGenByType={latestGenByType}
              previousByType={previousByType}
              hasTranscript={!!hasTranscript}
              isRunning={isRunning}
              generating={generating}
              totalAvailable={totalAvailable}
              onApply={handleApply}
              onGenerate={handleGenerate}
            />
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
          <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )}
        {status === 'running' && (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" aria-hidden="true" />
        )}
        {status === 'failed' && (
          <svg className="h-4 w-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
        {(status === 'queued' || status === 'idle') && (
          <div className={`h-4 w-4 rounded-full border-2 ${status === 'queued' ? 'border-text-tertiary' : 'border-border-subtle'}`} aria-hidden="true" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <span className="sr-only">
          {label}: {status === 'completed' ? 'complete' : status === 'running' ? 'in progress' : status === 'failed' ? 'failed' : 'waiting'}
        </span>
        <span className={`text-sm ${STEP_TEXT_COLOR[status]}`} aria-hidden="true">
          {label}
        </span>
        {detail && (
          <span className="ml-2 text-xs text-text-secondary">{detail}</span>
        )}
        {status === 'running' && !detail && (
          <span className="ml-2 text-xs text-accent animate-pulse">Processing...</span>
        )}
      </div>
    </div>
  )
}

function TranscriptSection(props: {
  segments: Array<{ start: number; end: number; text: string; speaker: number }>
  fullText: string
  speakerCount: number
  wordCount: number
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-md border border-border-subtle bg-surface-default">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-3 py-2"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-text-primary">Transcript</span>
          <span className="text-xs text-text-secondary">
            {props.wordCount.toLocaleString()} words · {props.speakerCount} speaker{props.speakerCount !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              navigator.clipboard.writeText(props.fullText)
            }}
            className="text-xs text-text-tertiary hover:text-text-secondary transition-colors"
          >
            Copy
          </button>
          <svg
            className={`h-3.5 w-3.5 text-text-tertiary transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      {open && (
        <div className="border-t border-border-subtle px-3 py-2">
          <TranscriptViewer
            segments={props.segments}
            fullText={props.fullText}
            speakerCount={props.speakerCount}
            wordCount={props.wordCount}
          />
        </div>
      )}
    </div>
  )
}

function RegenerateSection({ label, types, hasExisting, generating, totalAvailable, onGenerate }: {
  label: string
  types: GenerationType[]
  hasExisting: boolean
  generating: GenerationType | null
  totalAvailable: number
  onGenerate: (type: GenerationType) => void
}) {
  return (
    <div>
      <p className="text-xs text-text-secondary mb-2">
        {hasExisting ? `Regenerate ${label}:` : `Generate ${label} content:`}
      </p>
      <div className="flex flex-wrap gap-2">
        {types.map((type) => (
          <button
            key={type}
            onClick={() => onGenerate(type)}
            disabled={generating !== null || totalAvailable < 1}
            className="rounded-md border border-border-subtle bg-surface-default px-3 py-1.5 text-xs font-medium text-text-primary hover:border-accent hover:text-accent transition-colors disabled:opacity-50"
          >
            {generating === type ? 'Generating...' : `${GENERATION_LABELS[type]} (${CREDIT_COSTS[type]})`}
          </button>
        ))}
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
            aria-label="Audio URL"
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
              const files = data.data?.files || data.data?.items || []
              const audioFile = files.find((f: { mime_type?: string; mimeType?: string }) =>
                (f.mime_type || f.mimeType || '').startsWith('audio/') || (f.mime_type || f.mimeType || '').startsWith('video/')
              )
              if (audioFile) {
                onTranscribe(
                  audioFile.download_url || audioFile.downloadUrl || audioFile.view_url || audioFile.viewUrl,
                  'file_reference',
                  audioFile.external_id || audioFile.id,
                  audioFile.duration_seconds || audioFile.durationSeconds
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

function TitleSuggestions({ content, onRegenerate }: { content: string; onRegenerate: () => void }) {
  const titles = content
    .split('\n')
    .map(line => line.replace(/^\d+[\.\)]\s*/, '').trim())
    .filter(Boolean)

  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)

  return (
    <div className="space-y-2">
      <div className="space-y-1.5">
        {titles.map((title, i) => (
          <div key={i} className="flex items-center justify-between gap-2 rounded-md border border-border-subtle bg-surface-raised px-3 py-2">
            <span className="text-xs text-text-primary">{title}</span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(title)
                setCopiedIdx(i)
                setTimeout(() => setCopiedIdx(null), 2000)
              }}
              className="shrink-0 text-xs text-text-tertiary hover:text-text-secondary transition-colors"
            >
              {copiedIdx === i ? 'Copied!' : 'Copy'}
            </button>
          </div>
        ))}
      </div>
      <button
        onClick={onRegenerate}
        className="text-xs text-text-tertiary hover:text-text-secondary transition-colors"
      >
        Regenerate
      </button>
    </div>
  )
}

function SocialMeta({ type, content }: { type: GenerationType; content: string }) {
  if (type === 'social_twitter') {
    return (
      <div className={`text-xs tabular-nums ${content.length > 280 ? 'text-red-400' : 'text-text-tertiary'}`}>
        {content.length}/280
      </div>
    )
  }
  if (type === 'social_linkedin') {
    return (
      <div className="text-xs text-text-tertiary tabular-nums">
        {content.length} chars · {content.split(/\n\n+/).length} paragraphs
      </div>
    )
  }
  if (type === 'social_instagram') {
    const hashtagCount = (content.match(/#\w+/g) || []).length
    return (
      <div className="text-xs text-text-tertiary tabular-nums">
        {content.length} chars · {hashtagCount} hashtags
      </div>
    )
  }
  return null
}

const CONTENT_TABS = [
  { value: 0, types: PRODUCTION_TYPES, label: 'production', name: 'Production' },
  { value: 1, types: PROMOTION_TYPES, label: 'promotion', name: 'Promotion' },
] as const

function GeneratedContentTabs({
  latestGenByType,
  previousByType,
  hasTranscript,
  isRunning,
  generating,
  totalAvailable,
  onApply,
  onGenerate,
}: {
  latestGenByType: Map<string, Generation>
  previousByType: Map<string, Generation[]>
  hasTranscript: boolean
  isRunning: boolean
  generating: GenerationType | null
  totalAvailable: number
  onApply: (type: GenerationType, content: string) => Promise<boolean>
  onGenerate: (type: GenerationType) => void
}) {
  const [activeTab, setActiveTab] = useState(0)

  return (
    <Tabs defaultValue={0} onValueChange={(v) => setActiveTab(v as number)}>
      <div className="flex items-center justify-between">
        <TabsList variant="line">
          {CONTENT_TABS.map(tab => (
            <TabsTrigger key={tab.value} value={tab.value} className="text-xs">
              {tab.name}
            </TabsTrigger>
          ))}
        </TabsList>
        {activeTab === 1 && PROMOTION_TYPES.filter(t => latestGenByType.has(t)).length > 1 && (
          <button
            onClick={() => {
              const all = PROMOTION_TYPES
                .map(t => {
                  const gen = latestGenByType.get(t)
                  return gen ? `--- ${GENERATION_LABELS[t]} ---\n${gen.result}` : null
                })
                .filter(Boolean)
                .join('\n\n')
              navigator.clipboard.writeText(all)
            }}
            className="text-xs text-text-tertiary hover:text-text-secondary transition-colors"
          >
            Copy all
          </button>
        )}
      </div>

      {CONTENT_TABS.map(tab => (
        <TabsContent key={tab.value} value={tab.value} className="space-y-2">
          {tab.types.map((type) => {
            const gen = latestGenByType.get(type)
            if (!gen) return null
            return (
              <GeneratedResult
                key={gen.id}
                type={type as GenerationType}
                content={gen.result}
                previousVersions={previousByType.get(type)}
                onApply={(content) => onApply(type as GenerationType, content)}
                onCopy={(content) => navigator.clipboard.writeText(content)}
                onRegenerate={() => onGenerate(type as GenerationType)}
              />
            )
          })}
          {hasTranscript && !isRunning && (
            <RegenerateSection
              label={tab.label}
              types={[...tab.types]}
              hasExisting={tab.types.some(t => latestGenByType.has(t))}
              generating={generating}
              totalAvailable={totalAvailable}
              onGenerate={onGenerate}
            />
          )}
        </TabsContent>
      ))}
    </Tabs>
  )
}

function GeneratedResult({
  type,
  content,
  previousVersions,
  onApply,
  onCopy,
  onRegenerate,
}: {
  type: GenerationType
  content: string
  previousVersions?: Generation[]
  onApply: (content: string) => Promise<boolean>
  onCopy: (content: string) => void
  onRegenerate: () => void
}) {
  const canApply = type === 'show_notes' || type === 'description'
  const [applyState, setApplyState] = useState<'idle' | 'applied' | 'failed'>('idle')
  const [copied, setCopied] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editedContent, setEditedContent] = useState(content)
  const [showHistory, setShowHistory] = useState(false)

  const maxHeight = type === 'show_notes' ? 'max-h-[300px]' : 'max-h-[200px]'

  if (type === 'title_suggestions') {
    return (
      <div className="rounded-md border border-border-subtle bg-surface-default p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-text-primary">{GENERATION_LABELS[type]}</span>
        </div>
        <TitleSuggestions content={content} onRegenerate={onRegenerate} />
        {previousVersions && previousVersions.length > 0 && (
          <div className="mt-2">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="text-xs text-text-tertiary hover:text-text-secondary transition-colors"
            >
              {showHistory ? 'Hide previous' : `${previousVersions.length} previous`}
            </button>
            {showHistory && (
              <div className="mt-2 space-y-2 border-t border-border-subtle pt-2">
                {previousVersions.map((pv) => (
                  <div key={pv.id} className="rounded-md bg-surface-raised p-2 space-y-1">
                    <span className="text-xs text-text-tertiary">
                      {new Date(pv.created_at).toLocaleString()}
                    </span>
                    <div className="text-xs text-text-secondary whitespace-pre-wrap leading-relaxed line-clamp-3">
                      {pv.result}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-md border border-border-subtle bg-surface-default p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-text-primary">{GENERATION_LABELS[type]}</span>
        <div className="flex items-center gap-2">
          {canApply && applyState === 'idle' && (
            <button
              onClick={async () => {
                const ok = await onApply(content)
                setApplyState(ok ? 'applied' : 'failed')
                setTimeout(() => setApplyState('idle'), 2000)
              }}
              className="text-xs text-accent hover:text-accent-hover transition-colors"
            >
              Apply
            </button>
          )}
          {applyState === 'applied' && (
            <span className="text-xs text-emerald-400">Applied!</span>
          )}
          {applyState === 'failed' && (
            <span className="text-xs text-red-400">Failed</span>
          )}
          <button
            onClick={() => { onCopy(content); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
            className="text-xs text-text-tertiary hover:text-text-secondary transition-colors"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <button
            onClick={() => { setEditedContent(content); setEditOpen(true) }}
            className="text-xs text-text-tertiary hover:text-text-secondary transition-colors"
          >
            Edit
          </button>
          <button
            onClick={onRegenerate}
            className="text-xs text-text-tertiary hover:text-text-secondary transition-colors"
          >
            Regenerate
          </button>
        </div>
      </div>

      <div className={`${maxHeight} overflow-y-auto`}>
        {type === 'show_notes' ? (
          <MarkdownContent content={content} />
        ) : (
          <div className="text-xs text-text-secondary whitespace-pre-wrap leading-relaxed">
            {content}
          </div>
        )}
      </div>

      <SocialMeta type={type} content={content} />

      {previousVersions && previousVersions.length > 0 && (
        <div>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="text-xs text-text-tertiary hover:text-text-secondary transition-colors"
          >
            {showHistory ? 'Hide previous' : `${previousVersions.length} previous`}
          </button>
          {showHistory && (
            <div className="mt-2 space-y-2 border-t border-border-subtle pt-2">
              {previousVersions.map((pv) => (
                <div key={pv.id} className="rounded-md bg-surface-raised p-2 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text-tertiary">
                      {new Date(pv.created_at).toLocaleString()}
                    </span>
                    <button
                      onClick={() => onCopy(pv.result)}
                      className="text-xs text-text-tertiary hover:text-text-secondary transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                  <div className="text-xs text-text-secondary whitespace-pre-wrap leading-relaxed line-clamp-3">
                    {pv.result}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <EditContentDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        type={type}
        content={editedContent}
        onChange={setEditedContent}
        canApply={canApply}
        onApply={onApply}
        onCopy={onCopy}
      />
    </div>
  )
}

function EditContentDialog({
  open,
  onOpenChange,
  type,
  content,
  onChange,
  canApply,
  onApply,
  onCopy,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  type: GenerationType
  content: string
  onChange: (content: string) => void
  canApply: boolean
  onApply: (content: string) => Promise<boolean>
  onCopy: (content: string) => void
}) {
  const [applyState, setApplyState] = useState<'idle' | 'applying' | 'applied' | 'failed'>('idle')
  const [copied, setCopied] = useState(false)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col bg-surface-raised border-border-subtle">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold text-text-primary">
            Edit {GENERATION_LABELS[type]}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 min-h-0">
          <textarea
            value={content}
            onChange={(e) => onChange(e.target.value)}
            className="w-full h-full min-h-[300px] max-h-[50vh] rounded-md border border-border-subtle bg-surface-default px-3 py-2 text-xs text-text-primary leading-relaxed focus:border-accent focus:outline-none resize-y font-mono"
          />
        </div>
        <SocialMeta type={type} content={content} />
        <DialogFooter className="bg-transparent border-t-0 flex-row justify-between sm:justify-between">
          <button
            onClick={() => { onCopy(content); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
            className="text-xs text-text-tertiary hover:text-text-secondary transition-colors"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenChange(false)}
              className="rounded-md border border-border-subtle bg-surface-default px-3 py-1.5 text-xs font-medium text-text-secondary hover:border-border-hover transition-colors"
            >
              Cancel
            </button>
            {canApply && (
              <button
                onClick={async () => {
                  setApplyState('applying')
                  const ok = await onApply(content)
                  setApplyState(ok ? 'applied' : 'failed')
                  if (ok) {
                    setTimeout(() => { onOpenChange(false); setApplyState('idle') }, 1000)
                  } else {
                    setTimeout(() => setApplyState('idle'), 2000)
                  }
                }}
                disabled={applyState === 'applying'}
                className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
              >
                {applyState === 'applying' ? 'Applying...'
                  : applyState === 'applied' ? 'Applied!'
                  : applyState === 'failed' ? 'Failed'
                  : 'Save & Apply to Episode'}
              </button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

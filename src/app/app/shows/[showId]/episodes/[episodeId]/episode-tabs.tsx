'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { DeliveryPanel } from '@/components/episodes/delivery-panel'
import { formatDuration } from '@/lib/format'
import { type GenerationType, ALL_GENERATION_TYPES, GENERATION_LABELS, CREDIT_COSTS } from '@/lib/ai/constants'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { ThumbnailUpload } from '@/components/ui/thumbnail-upload'
import { RichTextEditor } from '@/components/episodes/rich-text-editor'
import type { IntegrationProvider } from '@/lib/integrations/types'
import type { Deliverable } from '@/lib/constants/deliverables'

type Tab = 'files' | 'content' | 'deliverables' | 'distribution' | 'activity'

interface Transcription {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  full_text: string | null
  segments: Array<{ start: number; end: number; text: string; speaker: number }> | null
  speaker_count: number | null
  word_count: number | null
  error_message: string | null
}

interface Generation {
  id: string
  generation_type: string
  result: string
  credits_consumed: number
  created_at: string
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

interface Activity {
  id: string
  action: string
  description: string
  created_at: string
}

interface PipelineStage {
  id: string
  name: string
  position: number
}

interface EpisodeTabsProps {
  episodeId: string
  showId: string
  showName: string
  clientName: string | null
  stage: { id: string; name: string } | null
  stages: PipelineStage[]
  episode: {
    title: string
    episode_number: number | null
    scheduled_publish_date: string | null
    published_at: string | null
    description: string | null
    notes: string | null
    image_url: string | null
  }
  integration: {
    provider: IntegrationProvider
    externalProjectId: string | null
    externalFolderId: string | null
    externalViewUrl: string | null
    displayName: string
    acceptedMimeTypes?: string[]
  } | null
  deliverables: Deliverable[]
  connectedProviders: IntegrationProvider[]
  hasIntegration: boolean
  hasAudioFiles: boolean
  fileCount: number
  distributionConnections: { id: string; provider: string }[]
}

const STAGE_COLORS: Record<string, string> = {
  planning: 'var(--color-status-planning)',
  recording: 'var(--color-status-recording)',
  editing: 'var(--color-status-editing)',
  review: 'var(--color-status-review)',
  approved: 'var(--color-status-approved)',
  published: 'var(--color-status-published)',
}

const actionDots: Record<string, string> = {
  episode_stage_changed: 'bg-blue-400',
  deliverable_submitted: 'bg-amber-400',
  deliverable_approved: 'bg-emerald-400',
  deliverable_revision_requested: 'bg-red-400',
  deliverable_resubmitted: 'bg-amber-400',
  episode_published: 'bg-emerald-400',
  file_uploaded: 'bg-sky-400',
  transcription_completed: 'bg-violet-400',
  ai_generation_completed: 'bg-violet-400',
}

const DELIVERABLE_STATUS: Record<string, { text: string; bg: string; label: string }> = {
  approved: { text: 'var(--color-success)', bg: 'oklch(0.74 0.14 165 / 0.18)', label: 'Approved' },
  pending: { text: 'var(--color-warning)', bg: 'oklch(0.78 0.13 75 / 0.18)', label: 'Pending' },
  revision_requested: { text: 'var(--color-error)', bg: 'oklch(0.66 0.18 22 / 0.18)', label: 'Revision' },
  draft: { text: 'var(--color-text-tertiary)', bg: 'var(--color-surface-overlay)', label: 'Draft' },
}

// Sanitizer only processes AI-generated content from our own pipeline, not user input
const ALLOWED_HTML_TAGS = /^(p|strong|em|a|ul|ol|li|br|h1|h2|h3|h4|h5|h6)$/i

function sanitizeHtml(html: string): string {
  return html.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g, (match, tag) => {
    if (!ALLOWED_HTML_TAGS.test(tag)) return ''
    const lower = tag.toLowerCase()
    if (match.startsWith('</')) return `</${lower}>`
    if (lower === 'a') {
      const href = match.match(/href="([^"]*)"/)
      return href ? `<a href="${href[1]}" target="_blank" rel="noopener noreferrer">` : ''
    }
    return `<${lower}>`
  })
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function ShowNotesContent({ html }: { html: string }) {
  const sanitized = sanitizeHtml(html)
  return (
    <div
      className="prose-sm text-[13.5px] text-text-secondary leading-[1.65] [&_strong]:text-text-primary [&_strong]:font-semibold [&_h4]:text-[13.5px] [&_h4]:font-semibold [&_h4]:text-text-primary [&_h4]:mt-3.5 [&_h4]:mb-1 [&_h4:first-child]:mt-0 [&_a]:text-accent [&_a]:underline [&_ul]:space-y-0.5 [&_ul]:my-1.5 [&_ul]:pl-[18px] [&_li]:leading-[1.65] [&_li]:my-0.5 [&_p]:max-w-[68ch] [&_ul]:max-w-[68ch]"
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  )
}

export function EpisodeTabs({
  episodeId, showId, showName, clientName, stage, stages, episode,
  integration, deliverables, connectedProviders, hasIntegration,
  hasAudioFiles, fileCount, distributionConnections,
}: EpisodeTabsProps) {
  const [tab, setTab] = useState<Tab>('files')
  const router = useRouter()

  // Inline-editable fields
  const [editTitle, setEditTitle] = useState<string | null>(null)
  const [editEpNum, setEditEpNum] = useState<string | null>(null)
  const [editDate, setEditDate] = useState<string | null>(null)
  const [editStage, setEditStage] = useState(false)
  const [imageUrl, setImageUrl] = useState(episode.image_url)
  const [saving, setSaving] = useState(false)

  const patchEpisode = async (fields: Record<string, unknown>) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/v1/shows/${showId}/episodes/${episodeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      })
      if (res.ok) { router.refresh(); return true }
      return false
    } catch { return false }
    finally { setSaving(false) }
  }

  const handleImageUploaded = async (fileKey: string) => {
    const filename = fileKey.split('/').pop() || 'thumbnail'
    const res = await fetch(`/api/v1/episodes/${episodeId}/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: filename, file_key: fileKey, asset_type: 'thumbnail' }),
    })
    if (res.ok) {
      const { data } = await res.json()
      setImageUrl(data.url ?? fileKey)
    }
  }

  // AI state
  const [generations, setGenerations] = useState<Generation[]>([])
  const [pipeline, setPipeline] = useState<PipelineJob | null>(null)
  const [transcription, setTranscription] = useState<Transcription | null>(null)
  const [aiLoading, setAiLoading] = useState(true)
  const [hasAudio, setHasAudio] = useState(hasAudioFiles)
  const [enabledTypes, setEnabledTypes] = useState<GenerationType[]>(ALL_GENERATION_TYPES)
  const [startingPipeline, setStartingPipeline] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  // Activity state
  const [activities, setActivities] = useState<Activity[]>([])
  const [actLoading, setActLoading] = useState(false)

  const fetchAi = useCallback(async () => {
    try {
      const [tRes, pRes, showRes] = await Promise.all([
        fetch(`/api/v1/episodes/${episodeId}/transcription`),
        fetch(`/api/v1/episodes/${episodeId}/pipeline`),
        fetch(`/api/v1/shows/${showId}`),
      ])
      if (tRes.ok) {
        const d = await tRes.json()
        setTranscription(d.data?.transcription || null)
      }
      if (pRes.ok) {
        const d = await pRes.json()
        setPipeline(d.data?.pipeline || null)
        setGenerations(d.data?.generations || [])
      }
      if (showRes.ok) {
        const d = await showRes.json()
        const show = d.data
        if (show?.ai_auto_generate?.length > 0) {
          setEnabledTypes(show.ai_auto_generate.filter((t: string): t is GenerationType =>
            ALL_GENERATION_TYPES.includes(t as GenerationType)))
        }
      }
    } finally {
      setAiLoading(false)
    }
  }, [episodeId, showId])

  useEffect(() => { fetchAi() }, [fetchAi])

  // Realtime subscriptions
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`ep-tabs:${episodeId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transcriptions', filter: `episode_id=eq.${episodeId}` },
        (payload) => { setTranscription(payload.new as unknown as Transcription) })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ai_pipeline_jobs', filter: `episode_id=eq.${episodeId}` },
        (payload) => {
          const updated = payload.new as unknown as PipelineJob
          setPipeline(updated)
          if (updated.status === 'completed' || updated.status === 'partial') {
            fetchAi()
            router.refresh()
          }
        })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ai_generations', filter: `episode_id=eq.${episodeId}` },
        (payload) => { setGenerations(prev => [payload.new as unknown as Generation, ...prev]) })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'file_references', filter: `episode_id=eq.${episodeId}` },
        (payload) => {
          const ref = payload.new as { mime_type?: string | null }
          if (ref.mime_type?.startsWith('audio/') || ref.mime_type?.startsWith('video/')) setHasAudio(true)
        })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [episodeId, fetchAi, router])

  // Fetch activities when tab changes
  useEffect(() => {
    if (tab !== 'activity') return
    setActLoading(true)
    fetch(`/api/v1/activity?show_id=${showId}&limit=30`)
      .then(r => r.json())
      .then(json => setActivities(json.data || []))
      .catch(() => {})
      .finally(() => setActLoading(false))
  }, [tab, showId])

  const latestGenByType = useMemo(() => {
    const map = new Map<string, Generation>()
    for (const g of generations) {
      if (!map.has(g.generation_type)) map.set(g.generation_type, g)
    }
    return map
  }, [generations])

  const isRunning = pipeline?.status === 'transcribing' || pipeline?.status === 'generating' || pipeline?.status === 'pending'

  const handleRunPipeline = async () => {
    setStartingPipeline(true)
    setAiError(null)
    try {
      const res = await fetch(`/api/v1/episodes/${episodeId}/pipeline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (!res.ok) { setAiError(data.error || 'Failed'); return }
      if (data.data?.status === 'skipped') { setAiError('Pipeline was skipped.'); return }
      setPipeline({ id: data.data.jobId, status: data.data.status, trigger_source: 'manual', error_message: null, skipped_reason: null, created_at: new Date().toISOString(), completed_at: null })
    } catch { setAiError('Failed to start AI pipeline') }
    finally { setStartingPipeline(false) }
  }

  const [generating, setGenerating] = useState<GenerationType | null>(null)

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
    } catch { return false }
  }

  const handleApplyTitle = async (title: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/v1/shows/${showId}/episodes/${episodeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      })
      if (!res.ok) return false
      router.refresh()
      return true
    } catch { return false }
  }

  const handleGenerate = async (type: GenerationType) => {
    setGenerating(type)
    try {
      const res = await fetch(`/api/v1/episodes/${episodeId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      })
      const data = await res.json()
      if (res.ok) {
        setGenerations(prev => [{
          id: data.data.generation.id,
          generation_type: type,
          result: data.data.generation.result,
          credits_consumed: data.data.generation.credits_consumed,
          created_at: new Date().toISOString(),
        }, ...prev])
      }
    } finally { setGenerating(null) }
  }

  const stageColor = stage ? STAGE_COLORS[stage.name.toLowerCase()] || undefined : undefined

  const showNotes = latestGenByType.get('show_notes')
  const description = latestGenByType.get('description')
  const titleSuggestions = latestGenByType.get('title_suggestions')
  const hasContent = showNotes || description || titleSuggestions

  const sortedStages = [...stages].sort((a, b) => a.position - b.position)

  return (
    <div className="mt-4">
      {/* Inline-editable title + thumbnail */}
      <div className="flex gap-4 items-start mb-5">
        <ThumbnailUpload
          id={episodeId}
          imageUrl={imageUrl}
          showId={showId}
          episodeId={episodeId}
          onUploaded={handleImageUploaded}
          className="w-[120px] shrink-0"
        />
        <div className="flex-1 min-w-0 pt-1">
          {editTitle !== null ? (
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                if (editTitle.trim()) {
                  await patchEpisode({ title: editTitle.trim() })
                }
                setEditTitle(null)
              }}
              className="flex items-center gap-2"
            >
              <input
                autoFocus
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                onBlur={async () => {
                  if (editTitle.trim() && editTitle.trim() !== episode.title) {
                    await patchEpisode({ title: editTitle.trim() })
                  }
                  setEditTitle(null)
                }}
                onKeyDown={e => { if (e.key === 'Escape') setEditTitle(null) }}
                className="w-full text-[22px] font-semibold tracking-[-0.02em] font-[family-name:var(--font-display)] text-text-primary bg-transparent border-b-2 border-accent focus:outline-none"
              />
            </form>
          ) : (
            <h1
              onClick={() => setEditTitle(episode.title)}
              className="text-[22px] font-semibold tracking-[-0.02em] font-[family-name:var(--font-display)] text-text-primary cursor-text hover:text-accent transition-colors"
              title="Click to edit title"
            >
              {episode.title}
            </h1>
          )}
          <p className="text-[13.5px] text-text-secondary mt-1">
            {showName}{clientName ? ` · with ${clientName}` : ''}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_312px] gap-6 items-start">
      {/* Main content */}
      <div className="min-w-0">
        {/* Tabs */}
        <div className="flex gap-0.5 border-b border-border-subtle mb-[18px]">
          {([
            { id: 'files' as Tab, label: 'Files', count: fileCount },
            { id: 'content' as Tab, label: 'Content' },
            { id: 'deliverables' as Tab, label: 'Shares', count: deliverables.length },
            { id: 'distribution' as Tab, label: 'Distribution' },
            { id: 'activity' as Tab, label: 'Activity' },
          ] as const).map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-2.5 py-2 text-[13px] border-b-2 -mb-px transition-colors ${
                tab === t.id
                  ? 'font-medium text-text-primary border-accent'
                  : 'font-[450] text-text-secondary border-transparent hover:text-text-primary'
              }`}
            >
              {t.label}
              {'count' in t && t.count != null && t.count > 0 && (
                <span className="font-mono text-[11px] text-fg-faint ml-1.5">{t.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Files tab */}
        {tab === 'files' && (
          <DeliveryPanel
            episodeId={episodeId}
            showId={showId}
            integration={integration}
            deliverables={deliverables}
            connectedProviders={connectedProviders}
            episode={{ ...episode, stage: stage ? { name: stage.name } : null }}
            hideSidebar
          />
        )}

        {/* Content tab — clean AI content */}
        {tab === 'content' && (
          <div>
            {aiLoading ? (
              <div className="py-12 text-center text-sm text-text-secondary">Loading...</div>
            ) : !hasContent && !isRunning ? (
              <div className="rounded-[10px] border border-border-subtle bg-surface-raised p-6 text-center space-y-3">
                <p className="text-sm text-text-secondary">
                  {hasAudio
                    ? 'Run the AI pipeline to generate show notes, descriptions, and title suggestions.'
                    : 'Upload or link audio to generate content from your episode.'}
                </p>
                {hasAudio && (
                  <button
                    onClick={handleRunPipeline}
                    disabled={startingPipeline}
                    className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
                  >
                    {startingPipeline ? 'Starting...' : 'Generate Content'}
                  </button>
                )}
                {aiError && <p className="text-xs text-red-400">{aiError}</p>}
              </div>
            ) : (
              <>
                {isRunning && (
                  <div className="flex items-center gap-2 text-sm text-text-secondary mb-4">
                    <div className="h-4 w-4 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                    AI pipeline running...
                  </div>
                )}

                <div className="flex flex-col lg:flex-row gap-6 items-start">
                  {/* Left: show notes + description */}
                  <div className="flex-1 min-w-0 space-y-6">
                    {showNotes && (
                      <ContentBlock
                        type="show_notes"
                        content={showNotes.result}
                        onApply={(c) => handleApply('show_notes', c)}
                        onRegenerate={() => handleGenerate('show_notes')}
                        generating={generating === 'show_notes'}
                      />
                    )}

                    {description && (
                      <ContentBlock
                        type="description"
                        content={description.result}
                        onApply={(c) => handleApply('description', c)}
                        onRegenerate={() => handleGenerate('description')}
                        generating={generating === 'description'}
                      />
                    )}
                  </div>

                  {/* Right: title suggestions */}
                  {titleSuggestions && (
                    <div className="w-full lg:w-[340px] shrink-0">
                      <div className="rounded-[10px] border border-border-subtle bg-surface-raised overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-[11px] border-b border-border-subtle">
                          <h3 className="text-[13px] font-semibold text-text-primary">Title Suggestions</h3>
                          <button
                            onClick={() => handleGenerate('title_suggestions')}
                            disabled={generating !== null}
                            className="rounded border border-border-subtle bg-surface-default px-2 py-0.5 text-xs text-text-secondary hover:border-border-hover hover:text-text-primary transition-colors disabled:opacity-50"
                          >
                            {generating === 'title_suggestions' ? 'Generating...' : 'Regenerate'}
                          </button>
                        </div>
                        <TitleSuggestionsList content={titleSuggestions.result} onApplyTitle={handleApplyTitle} />
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Deliverables tab */}
        {tab === 'deliverables' && (
          <div>
            {deliverables.length === 0 ? (
              <div className="rounded-[10px] border border-border-subtle bg-surface-raised p-6 text-center">
                <p className="text-sm text-text-secondary">No shared files yet. Share files from the Files tab to get client feedback.</p>
              </div>
            ) : (
              <div className="rounded-[10px] border border-border-subtle bg-surface-raised overflow-hidden">
                {deliverables.map((d) => {
                  const s = DELIVERABLE_STATUS[d.status] || DELIVERABLE_STATUS.draft
                  return (
                    <div key={d.id} className="flex items-center gap-3 px-4 py-3 border-b border-border-subtle last:border-b-0">
                      <span className="flex-1 text-[13px] text-text-primary truncate">{d.title}</span>
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded" style={{ color: s.text, background: s.bg }}>
                        {s.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Distribution tab */}
        {tab === 'distribution' && (
          <div>
            {distributionConnections.length === 0 ? (
              <div className="rounded-[10px] border border-border-subtle bg-surface-raised p-6 text-center space-y-2">
                <p className="text-sm text-text-secondary">No distribution channels connected for this show.</p>
                <Link href={`/app/shows/${showId}`} className="text-sm text-accent hover:text-accent-hover transition-colors">
                  Configure in show settings
                </Link>
              </div>
            ) : (
              <div className="rounded-[10px] border border-border-subtle bg-surface-raised overflow-hidden">
                {distributionConnections.map((dc) => (
                  <div key={dc.id} className="flex items-center gap-3 px-4 py-3 border-b border-border-subtle last:border-b-0">
                    <span className="text-[13px] font-medium text-text-primary capitalize">{dc.provider.replace('_', ' ')}</span>
                    <span className="ml-auto text-xs text-text-secondary">Connected</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Activity tab */}
        {tab === 'activity' && (
          <div>
            {actLoading ? (
              <div className="py-12 text-center text-sm text-text-secondary">Loading...</div>
            ) : activities.length === 0 ? (
              <div className="rounded-[10px] border border-border-subtle bg-surface-raised p-6 text-center">
                <p className="text-sm text-text-secondary">No activity yet for this episode.</p>
              </div>
            ) : (
              <div className="rounded-[10px] border border-border-subtle bg-surface-raised divide-y divide-border-subtle overflow-hidden">
                {activities.map((a) => {
                  const dot = actionDots[a.action] || 'bg-text-tertiary'
                  return (
                    <div key={a.id} className="flex items-start gap-3 px-4 py-3">
                      <span className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${dot}`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-text-primary">{a.description}</p>
                        <span className="text-xs text-text-secondary">{timeAgo(a.created_at)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sidebar */}
      <aside className="xl:sticky xl:top-[60px] flex flex-col gap-3.5">
        {/* Metadata — inline editable */}
        <div className="bg-surface-raised border border-border-subtle rounded-[10px] p-4">
          {/* Stage — click to open dropdown */}
          <div className="flex justify-between gap-3 py-[9px] border-b border-border-subtle text-[13px]">
            <span className="text-text-secondary">Stage</span>
            {editStage ? (
              <select
                autoFocus
                value={stage?.id || ''}
                onChange={async (e) => {
                  await patchEpisode({ stage_id: e.target.value || null })
                  setEditStage(false)
                }}
                onBlur={() => setEditStage(false)}
                className="text-[13px] text-text-primary bg-surface-input border border-border-default rounded-md px-2 py-0.5 focus:border-accent focus:outline-none"
              >
                <option value="">None</option>
                {sortedStages.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            ) : (
              <button onClick={() => setEditStage(true)} className="text-right cursor-pointer hover:text-accent transition-colors">
                {stage ? (
                  <span className="inline-flex items-center gap-1.5 text-[11.5px] font-medium px-2 py-0.5 rounded-full border border-border-subtle bg-surface-input text-text-secondary">
                    <span className="w-[7px] h-[7px] rounded-full" style={{ background: stageColor }} />
                    {stage.name}
                  </span>
                ) : <span className="text-text-tertiary">—</span>}
              </button>
            )}
          </div>

          <MetaRow label="Show" value={
            <Link href={`/app/shows/${showId}`} className="text-text-primary hover:text-accent transition-colors">{showName}</Link>
          } />
          {clientName && <MetaRow label="Client" value={clientName} />}

          {/* Episode # — click to edit */}
          <div className="flex justify-between gap-3 py-[9px] border-b border-border-subtle text-[13px]">
            <span className="text-text-secondary">Episode</span>
            {editEpNum !== null ? (
              <input
                autoFocus
                type="number"
                value={editEpNum}
                onChange={e => setEditEpNum(e.target.value)}
                onBlur={async () => {
                  const num = editEpNum ? Number(editEpNum) : null
                  if (num !== episode.episode_number) {
                    await patchEpisode({ episode_number: num })
                  }
                  setEditEpNum(null)
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                  if (e.key === 'Escape') setEditEpNum(null)
                }}
                className="w-16 text-right font-mono text-[13px] text-text-primary bg-surface-input border border-border-default rounded-md px-2 py-0.5 focus:border-accent focus:outline-none"
              />
            ) : (
              <button
                onClick={() => setEditEpNum(episode.episode_number?.toString() ?? '')}
                className="font-mono text-text-primary cursor-text hover:text-accent transition-colors text-right"
              >
                {episode.episode_number != null ? String(episode.episode_number).padStart(3, '0') : '—'}
              </button>
            )}
          </div>

          {/* Scheduled date — click to edit */}
          <div className="flex justify-between gap-3 py-[9px] border-b border-border-subtle last:border-b-0 text-[13px]">
            <span className="text-text-secondary">Schedule</span>
            {editDate !== null ? (
              <input
                autoFocus
                type="date"
                value={editDate}
                onChange={async (e) => {
                  const val = e.target.value || null
                  await patchEpisode({ scheduled_publish_date: val })
                  setEditDate(null)
                }}
                onBlur={() => setEditDate(null)}
                onKeyDown={e => { if (e.key === 'Escape') setEditDate(null) }}
                className="text-[13px] font-mono text-text-primary bg-surface-input border border-border-default rounded-md px-2 py-0.5 focus:border-accent focus:outline-none"
              />
            ) : (
              <button
                onClick={() => setEditDate(episode.scheduled_publish_date || '')}
                className="font-mono text-text-primary cursor-text hover:text-accent transition-colors text-right"
              >
                {episode.scheduled_publish_date
                  ? new Date(episode.scheduled_publish_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  : '—'}
              </button>
            )}
          </div>
        </div>

      </aside>
      </div>
    </div>
  )
}

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3 py-[9px] border-b border-border-subtle last:border-b-0 text-[13px]">
      <span className="text-text-secondary">{label}</span>
      <span className="text-text-primary text-right">{value}</span>
    </div>
  )
}

function ContentBlock({ type, content, onApply, onRegenerate, generating }: {
  type: GenerationType
  content: string
  onApply: (content: string) => Promise<boolean>
  onRegenerate: () => void
  generating: boolean
}) {
  const [applyState, setApplyState] = useState<'idle' | 'confirm' | 'applying' | 'applied' | 'failed'>('idle')
  const [copied, setCopied] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editedContent, setEditedContent] = useState(content)
  const isShowNotes = type === 'show_notes'
  const label = type === 'show_notes' ? 'Show Notes' : type === 'description' ? 'Description' : GENERATION_LABELS[type]

  return (
    <div className="rounded-[10px] border border-border-subtle bg-surface-raised overflow-hidden">
      <div className="flex items-center justify-between px-4 py-[11px] border-b border-border-subtle">
        <h3 className="text-[13px] font-semibold text-text-primary">{label}</h3>
        <div className="flex items-center gap-1.5">
          {applyState === 'idle' && (
            <button
              onClick={() => setApplyState('confirm')}
              className="rounded bg-accent px-2 py-0.5 text-xs font-medium text-white hover:bg-accent-hover transition-colors"
            >
              Apply
            </button>
          )}
          {applyState === 'confirm' && (
            <>
              <span className="text-xs text-text-secondary">Overwrite?</span>
              <button
                onClick={async () => {
                  setApplyState('applying')
                  const ok = await onApply(content)
                  setApplyState(ok ? 'applied' : 'failed')
                  setTimeout(() => setApplyState('idle'), 2000)
                }}
                className="rounded bg-accent px-2 py-0.5 text-xs font-medium text-white hover:bg-accent-hover transition-colors"
              >
                Confirm
              </button>
              <button onClick={() => setApplyState('idle')} className="rounded border border-border-subtle bg-surface-default px-2 py-0.5 text-xs text-text-secondary hover:border-border-hover hover:text-text-primary transition-colors">
                Cancel
              </button>
            </>
          )}
          {applyState === 'applying' && <span className="text-xs text-text-secondary">Applying...</span>}
          {applyState === 'applied' && <span className="text-xs text-emerald-400">Applied!</span>}
          {applyState === 'failed' && <span className="text-xs text-red-400">Failed</span>}
          <button
            onClick={() => { navigator.clipboard.writeText(content.replace(/<[^>]*>/g, '')); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
            className="rounded border border-border-subtle bg-surface-default px-2 py-0.5 text-xs text-text-secondary hover:border-border-hover hover:text-text-primary transition-colors"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <button
            onClick={() => { setEditedContent(content); setEditOpen(true) }}
            className="rounded border border-border-subtle bg-surface-default px-2 py-0.5 text-xs text-text-secondary hover:border-border-hover hover:text-text-primary transition-colors"
          >
            Edit
          </button>
          <button
            onClick={onRegenerate}
            disabled={generating}
            className="rounded border border-border-subtle bg-surface-default px-2 py-0.5 text-xs text-text-secondary hover:border-border-hover hover:text-text-primary transition-colors disabled:opacity-50"
          >
            {generating ? 'Generating...' : 'Regenerate'}
          </button>
        </div>
      </div>
      <div className="p-4">
        {isShowNotes ? (
          <ShowNotesContent html={content} />
        ) : (
          <div className="text-[13.5px] text-text-secondary whitespace-pre-wrap leading-[1.65] max-w-[68ch]">
            {content}
          </div>
        )}
      </div>

      <EditContentDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        type={type}
        content={editedContent}
        onChange={setEditedContent}
        onApply={onApply}
      />
    </div>
  )
}

function TitleSuggestionsList({ content, onApplyTitle }: {
  content: string
  onApplyTitle: (title: string) => Promise<boolean>
}) {
  const titles = content
    .split('\n')
    .map(line => line.replace(/^\d+[\.\)]\s*/, '').trim())
    .filter(Boolean)

  const [appliedIdx, setAppliedIdx] = useState<number | null>(null)

  return (
    <div>
      {titles.map((title, i) => (
        <div key={i} className="flex items-start gap-2.5 px-3.5 py-[11px] border-b border-border-subtle last:border-b-0 hover:bg-[oklch(0.21_0.006_264_/_0.4)] transition-colors">
          <span className="font-mono text-[11px] text-text-tertiary pt-0.5 shrink-0">{i + 1}.</span>
          <span className="flex-1 text-[13px] text-text-primary leading-[1.4]">{title}</span>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={async () => {
                const ok = await onApplyTitle(title)
                if (ok) { setAppliedIdx(i); setTimeout(() => setAppliedIdx(null), 2000) }
              }}
              className="rounded bg-accent px-2 py-0.5 text-xs font-medium text-white hover:bg-accent-hover transition-colors"
            >
              {appliedIdx === i ? 'Applied!' : 'Use'}
            </button>
            <button
              onClick={() => navigator.clipboard.writeText(title)}
              className="rounded border border-border-subtle bg-surface-default px-2 py-0.5 text-xs text-text-secondary hover:border-border-hover hover:text-text-primary transition-colors"
            >
              Copy
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

function EditContentDialog({ open, onOpenChange, type, content, onChange, onApply }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  type: GenerationType
  content: string
  onChange: (content: string) => void
  onApply: (content: string) => Promise<boolean>
}) {
  const [applyState, setApplyState] = useState<'idle' | 'applying' | 'applied' | 'failed'>('idle')
  const [copied, setCopied] = useState(false)
  const isShowNotes = type === 'show_notes'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col bg-surface-raised border-border-subtle">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold text-text-primary">
            Edit {GENERATION_LABELS[type]}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 min-h-0">
          {isShowNotes ? (
            <RichTextEditor content={content} onChange={onChange} limit={4000} />
          ) : (
            <textarea
              value={content}
              onChange={(e) => onChange(e.target.value)}
              className="w-full h-full min-h-[300px] max-h-[50vh] rounded-md border border-border-subtle bg-surface-default px-3 py-2 text-xs text-text-primary leading-relaxed focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/20 focus:outline-none resize-y font-mono"
            />
          )}
        </div>
        <DialogFooter className="bg-transparent border-t-0 flex-row justify-between sm:justify-between">
          <button
            onClick={() => { navigator.clipboard.writeText(content.replace(/<[^>]*>/g, '')); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
            className="rounded border border-border-subtle bg-surface-default px-2 py-0.5 text-xs text-text-secondary hover:border-border-hover hover:text-text-primary transition-colors"
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
                : 'Save & Apply'}
            </button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

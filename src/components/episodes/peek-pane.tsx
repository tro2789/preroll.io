import Link from 'next/link'

interface PeekPaneProps {
  episode: {
    episode_number: number | null
    scheduled_publish_date: string | null
    recorded_at?: string | null
    published_at: string | null
    description: string | null
    notes: string | null
  }
  stage: { name: string } | null
  showName: string
  clientName: string | null
  showId: string
  deliverables: { id: string; title: string; status: string }[]
}

const STATUS_COLORS: Record<string, { text: string; bg: string }> = {
  approved: { text: 'var(--color-success)', bg: 'oklch(0.74 0.14 165 / 0.18)' },
  pending: { text: 'var(--color-warning)', bg: 'oklch(0.78 0.13 75 / 0.18)' },
  revision_requested: { text: 'var(--color-error)', bg: 'oklch(0.66 0.18 22 / 0.18)' },
  draft: { text: 'var(--color-text-tertiary)', bg: 'var(--color-surface-overlay)' },
}

const STATUS_LABELS: Record<string, string> = {
  approved: 'Approved',
  pending: 'Pending',
  revision_requested: 'Revision',
  draft: 'Draft',
}

const STAGE_COLORS: Record<string, string> = {
  planning: 'var(--color-status-planning)',
  recording: 'var(--color-status-recording)',
  editing: 'var(--color-status-editing)',
  review: 'var(--color-status-review)',
  approved: 'var(--color-status-approved)',
  published: 'var(--color-status-published)',
}

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function PeekPane({ episode, stage, showName, clientName, showId, deliverables }: PeekPaneProps) {
  const stageColor = stage ? STAGE_COLORS[stage.name.toLowerCase()] || 'var(--color-text-tertiary)' : undefined

  return (
    <div className="flex flex-col gap-3.5">
      {/* Metadata card */}
      <div className="bg-surface-raised border border-border-subtle rounded-[10px] p-4">
        <MetaRow label="Stage" value={
          stage ? (
            <span className="inline-flex items-center gap-1.5 text-[11.5px] font-medium px-2 py-0.5 rounded-full border border-border-subtle bg-surface-input text-text-secondary">
              <span className="w-[7px] h-[7px] rounded-full inline-block" style={{ background: stageColor }} />
              {stage.name}
            </span>
          ) : '—'
        } />
        <MetaRow label="Show" value={showName} />
        {clientName && <MetaRow label="Client" value={clientName} />}
        {episode.episode_number != null && (
          <MetaRow label="Episode #" value={<span className="font-mono">{String(episode.episode_number).padStart(3, '0')}</span>} />
        )}
        <MetaRow label="Scheduled" value={<span className="font-mono">{formatDate(episode.scheduled_publish_date)}</span>} />
        {episode.published_at && (
          <MetaRow label="Published" value={<span className="font-mono">{formatDate(episode.published_at)}</span>} />
        )}
      </div>

      {/* Linked deliverables */}
      {deliverables.length > 0 && (
        <div className="bg-surface-raised border border-border-subtle rounded-[10px] overflow-hidden">
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border-subtle">
            <h3 className="text-[13.5px] font-semibold text-text-primary">Linked deliverables</h3>
            <span className="ml-auto text-[11px] text-text-tertiary">{deliverables.length}</span>
          </div>
          <div className="py-1.5">
            {deliverables.map((d) => {
              const colors = STATUS_COLORS[d.status] || STATUS_COLORS.draft
              const label = STATUS_LABELS[d.status] || d.status
              return (
                <div key={d.id} className="flex items-center gap-3 px-4 py-2">
                  <span className="flex-1 text-[12.5px] text-text-primary truncate">{d.title}</span>
                  <span
                    className="text-[11px] font-semibold font-mono px-1.5 py-0.5 rounded"
                    style={{ color: colors.text, background: colors.bg }}
                  >
                    {label}
                  </span>
                </div>
              )
            })}
          </div>
          <div className="px-4 py-2 border-t border-border-subtle">
            <Link
              href={`/app/shows/${showId}`}
              className="flex items-center justify-center gap-1.5 w-full py-1.5 text-[12px] text-text-secondary hover:text-text-primary rounded-[5px] hover:bg-surface-overlay transition-colors"
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 5v14M5 12h14" /></svg>
              Add deliverable
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3 py-2.5 border-b border-border-subtle last:border-b-0 text-[13px]">
      <span className="text-text-tertiary">{label}</span>
      <span className="text-text-primary text-right">{value}</span>
    </div>
  )
}

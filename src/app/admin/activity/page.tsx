export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'
import { timeAgo } from '@/lib/format'
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table'

export default async function AdminActivityPage() {
  const service = createServiceClient()

  const [
    { data: activityData },
    { data: orgData },
    { data: creditData },
    { data: generationData },
    { data: transcriptionData },
  ] = await Promise.all([
    service
      .from('activity_log')
      .select(
        'id, action, description, metadata, created_at, shows(id, name, org_id), episodes(id, title)'
      )
      .order('created_at', { ascending: false })
      .limit(100),
    service.from('organizations').select('id, name'),
    service
      .from('ai_credit_usage')
      .select(
        'id, org_id, credits_used, balance_after, reason, created_at'
      )
      .order('created_at', { ascending: false })
      .limit(50),
    service
      .from('ai_generations')
      .select(
        'id, org_id, episode_id, generation_type, model, credits_consumed, created_at'
      )
      .order('created_at', { ascending: false })
      .limit(50),
    service
      .from('transcriptions')
      .select(
        'id, org_id, episode_id, status, audio_duration_seconds, credits_consumed, created_at'
      )
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  const activity = activityData ?? []
  const credits = creditData ?? []
  const generations = generationData ?? []
  const transcriptions = transcriptionData ?? []

  // Build org name lookup
  const orgMap = new Map<string, string>()
  for (const org of orgData ?? []) {
    orgMap.set(org.id, org.name)
  }

  // Merge generations + transcriptions into a unified AI pipeline list
  type PipelineItem = {
    id: string
    kind: 'generation' | 'transcription'
    org_id: string
    label: string
    statusOrModel: string
    credits: number
    created_at: string
  }

  const pipelineItems: PipelineItem[] = [
    ...generations.map((g) => ({
      id: g.id,
      kind: 'generation' as const,
      org_id: g.org_id,
      label: g.generation_type,
      statusOrModel: g.model ?? '—',
      credits: g.credits_consumed ?? 0,
      created_at: g.created_at,
    })),
    ...transcriptions.map((t) => ({
      id: t.id,
      kind: 'transcription' as const,
      org_id: t.org_id,
      label: 'transcription',
      statusOrModel: t.status ?? '—',
      credits: t.credits_consumed ?? 0,
      created_at: t.created_at,
    })),
  ]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .slice(0, 50)

  function truncate(text: string | null, max: number) {
    if (!text) return '—'
    return text.length > max ? text.slice(0, max) + '...' : text
  }

  function resolveOrgFromShow(
    show: { id: string; name: string; org_id: string } | null
  ) {
    if (!show?.org_id) return '—'
    return orgMap.get(show.org_id) ?? show.org_id
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Section 1: Episode Activity */}
      <div>
        <h2 className="text-lg font-semibold text-text-primary mb-3">
          Episode Activity{' '}
          <span className="text-sm font-normal text-text-secondary">
            ({activity.length})
          </span>
        </h2>
        <div className="rounded-lg border border-border-subtle bg-surface-raised">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Org</TableHead>
                <TableHead>Episode</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activity.map((row) => {
                const show = row.shows as unknown as {
                  id: string
                  name: string
                  org_id: string
                } | null
                const episode = row.episodes as unknown as {
                  id: string
                  title: string
                } | null
                return (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium text-text-primary">
                      {row.action}
                    </TableCell>
                    <TableCell className="text-text-secondary max-w-[300px]">
                      {truncate(row.description, 80)}
                    </TableCell>
                    <TableCell className="text-text-secondary">
                      {resolveOrgFromShow(show)}
                    </TableCell>
                    <TableCell>
                      {episode ? (
                        <span className="text-text-primary">
                          {truncate(episode.title, 40)}
                        </span>
                      ) : (
                        <span className="text-text-tertiary">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-text-secondary">
                      {timeAgo(row.created_at)}
                    </TableCell>
                  </TableRow>
                )
              })}
              {activity.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-6 text-text-secondary"
                  >
                    No episode activity yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Section 2: AI Pipeline Activity */}
      <div>
        <h2 className="text-lg font-semibold text-text-primary mb-3">
          AI Pipeline{' '}
          <span className="text-sm font-normal text-text-secondary">
            ({pipelineItems.length})
          </span>
        </h2>
        <div className="rounded-lg border border-border-subtle bg-surface-raised">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Org</TableHead>
                <TableHead>Status / Model</TableHead>
                <TableHead>Credits</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pipelineItems.map((item) => (
                <TableRow key={`${item.kind}-${item.id}`}>
                  <TableCell className="font-medium text-text-primary">
                    {item.label}
                  </TableCell>
                  <TableCell className="text-text-secondary">
                    {orgMap.get(item.org_id) ?? item.org_id}
                  </TableCell>
                  <TableCell>
                    {item.kind === 'transcription' ? (
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          item.statusOrModel === 'completed'
                            ? 'bg-success/10 text-success'
                            : item.statusOrModel === 'failed'
                              ? 'bg-error/10 text-error'
                              : 'bg-warning/10 text-warning'
                        }`}
                      >
                        {item.statusOrModel}
                      </span>
                    ) : (
                      <span className="text-text-secondary">
                        {item.statusOrModel}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-text-primary">
                    {item.credits}
                  </TableCell>
                  <TableCell className="text-text-secondary">
                    {timeAgo(item.created_at)}
                  </TableCell>
                </TableRow>
              ))}
              {pipelineItems.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-6 text-text-secondary"
                  >
                    No AI pipeline activity yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Section 3: Credit Activity */}
      <div>
        <h2 className="text-lg font-semibold text-text-primary mb-3">
          Credit Activity{' '}
          <span className="text-sm font-normal text-text-secondary">
            ({credits.length})
          </span>
        </h2>
        <div className="rounded-lg border border-border-subtle bg-surface-raised">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Org</TableHead>
                <TableHead>Credits</TableHead>
                <TableHead>Balance After</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {credits.map((row) => {
                const isGrant = row.credits_used < 0
                return (
                  <TableRow key={row.id}>
                    <TableCell className="text-text-secondary">
                      {orgMap.get(row.org_id) ?? row.org_id}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`font-medium ${isGrant ? 'text-success' : 'text-text-primary'}`}
                      >
                        {isGrant ? '+' : ''}
                        {Math.abs(row.credits_used)}
                      </span>
                    </TableCell>
                    <TableCell className="text-text-primary">
                      {row.balance_after}
                    </TableCell>
                    <TableCell className="text-text-secondary max-w-[300px]">
                      {truncate(row.reason, 60)}
                    </TableCell>
                    <TableCell className="text-text-secondary">
                      {timeAgo(row.created_at)}
                    </TableCell>
                  </TableRow>
                )
              })}
              {credits.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-6 text-text-secondary"
                  >
                    No credit activity yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}

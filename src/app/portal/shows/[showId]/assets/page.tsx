import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { DeliverableCard } from '@/components/portal/deliverable-card'

export default async function PortalAssetsPage({
  params,
}: {
  params: Promise<{ showId: string }>
}) {
  const { showId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: show } = await supabase
    .from('shows')
    .select('id, name, cover_art_url')
    .eq('id', showId)
    .single()

  if (!show) redirect('/portal')

  const [{ data: assets }, { data: deliverables }] = await Promise.all([
    supabase
      .from('assets')
      .select('id, name, asset_type, mime_type, file_key')
      .eq('show_id', showId)
      .is('episode_id', null)
      .order('created_at', { ascending: false }),
    supabase
      .from('deliverables')
      .select('id, type, title, description, file_url, status, producer_notes, reviewer_notes, reviewed_at, created_at')
      .eq('show_id', showId)
      .is('episode_id', null)
      .order('created_at', { ascending: false }),
  ])

  const assetTypeLabels: Record<string, string> = {
    cover_art: 'Cover Art',
    intro: 'Intro',
    outro: 'Outro',
    music_bed: 'Music Bed',
    thumbnail: 'Thumbnail',
    show_notes: 'Show Notes',
    clip: 'Clip',
    other: 'Other',
  }

  return (
    <div className="space-y-8">
      <div>
        <Link
          href={`/portal/shows/${showId}`}
          className="text-xs text-text-tertiary hover:text-text-secondary transition-colors"
        >
          &larr; {show.name}
        </Link>
        <h1 className="text-lg font-semibold text-text-primary mt-3">Brand Assets</h1>
      </div>

      {assets && assets.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-text-secondary">Assets</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {assets.map((asset) => (
              <div
                key={asset.id}
                className="rounded-lg bg-surface-raised border border-border-subtle p-4"
              >
                <span className="text-xs text-text-tertiary">
                  {assetTypeLabels[asset.asset_type] || asset.asset_type}
                </span>
                <p className="text-sm font-medium text-text-primary mt-1">{asset.name}</p>
                {asset.mime_type && (
                  <p className="text-xs text-text-tertiary mt-1">{asset.mime_type}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <h2 className="text-sm font-medium text-text-secondary">
          Deliverables for Review
          {deliverables && deliverables.length > 0 && (
            <span className="ml-2 text-text-tertiary font-normal">({deliverables.length})</span>
          )}
        </h2>

        {!deliverables || deliverables.length === 0 ? (
          <p className="text-sm text-text-tertiary py-4 text-center">
            No brand deliverables to review.
          </p>
        ) : (
          <div className="space-y-3">
            {deliverables.map((d) => (
              <DeliverableCard key={d.id} deliverable={d} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

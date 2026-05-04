import Link from 'next/link'
import { Thumbnail } from '@/components/ui/thumbnail'

interface Show {
  id: string
  name: string
  format?: string | null
  schedule?: string | null
  cover_art_url?: string | null
  episode_count?: number
}

export function ShowCard({ show }: { show: Show }) {
  return (
    <Link
      href={`/app/shows/${show.id}`}
      className="block rounded-lg border border-border-subtle bg-surface-raised overflow-hidden transition-colors hover:border-border-hover"
    >
      <Thumbnail id={show.id} imageUrl={show.cover_art_url} className="aspect-[16/9]" />
      <div className="p-4">
        <h3 className="text-base font-semibold text-text-primary">{show.name}</h3>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {show.format && (
            <span className="inline-flex items-center rounded-full bg-accent-muted px-2.5 py-0.5 text-xs font-medium text-accent">
              {show.format}
            </span>
          )}
          {show.schedule && (
            <span className="text-xs text-text-secondary">{show.schedule}</span>
          )}
        </div>
        {typeof show.episode_count === 'number' && (
          <p className="mt-2 text-xs text-text-tertiary">
            {show.episode_count} {show.episode_count === 1 ? 'episode' : 'episodes'}
          </p>
        )}
      </div>
    </Link>
  )
}

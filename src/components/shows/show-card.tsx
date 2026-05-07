import Link from 'next/link'
import { Thumbnail } from '@/components/ui/thumbnail'

interface Show {
  id: string
  name: string
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
        {typeof show.episode_count === 'number' && (
          <p className="mt-2 text-xs text-text-tertiary">
            {show.episode_count} {show.episode_count === 1 ? 'episode' : 'episodes'}
          </p>
        )}
      </div>
    </Link>
  )
}

import { Thumbnail } from '@/components/ui/thumbnail'

interface ShowHeroProps {
  show: {
    id: string
    name: string
    description?: string | null
    format?: string | null
    schedule?: string | null
    coverArtUrl?: string | null
  }
}

export function ShowHero({ show }: ShowHeroProps) {
  return (
    <div className="flex items-start gap-4">
      <Thumbnail
        id={show.id}
        imageUrl={show.coverArtUrl}
        className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-xl"
      />
      <div className="min-w-0">
        <h1 className="text-xl font-bold text-text-primary">{show.name}</h1>
        <div className="flex items-center gap-2 mt-1">
          {show.format && (
            <span className="text-xs font-medium bg-surface-overlay border border-border-subtle rounded-full px-2.5 py-0.5 text-text-secondary">
              {show.format}
            </span>
          )}
          {show.schedule && (
            <span className="text-xs text-text-tertiary">{show.schedule}</span>
          )}
        </div>
        {show.description && (
          <p className="text-sm text-text-secondary leading-relaxed line-clamp-2 mt-2">
            {show.description}
          </p>
        )}
      </div>
    </div>
  )
}

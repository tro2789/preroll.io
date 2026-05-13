import { Thumbnail } from '@/components/ui/thumbnail'

interface ShowHeroProps {
  show: {
    id: string
    name: string
    description?: string | null
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
        <h1 className="text-[20px] font-semibold tracking-[-0.02em] font-[family-name:var(--font-display)] text-text-primary">{show.name}</h1>
        {show.description && (
          <p className="text-sm text-text-secondary leading-relaxed line-clamp-2 mt-2">
            {show.description}
          </p>
        )}
      </div>
    </div>
  )
}

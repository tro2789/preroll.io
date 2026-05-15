import { Skeleton } from '@/components/ui/skeleton'

export default function EpisodeDetailLoading() {
  return (
    <div className="max-w-[1640px] mx-auto space-y-6">
      {/* Header actions */}
      <div className="flex items-start gap-4">
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-20 rounded-md" />
          <Skeleton className="h-9 w-9 rounded-md" />
        </div>
      </div>

      {/* Episode title & properties */}
      <div className="space-y-4">
        <Skeleton className="h-7 w-64" />

        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-40" />
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-border-subtle pb-2">
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-8 w-14" />
        <Skeleton className="h-8 w-10" />
      </div>

      {/* Content area */}
      <div className="space-y-4">
        <Skeleton className="h-32 w-full rounded-lg" />
        <Skeleton className="h-24 w-full rounded-lg" />
      </div>
    </div>
  )
}

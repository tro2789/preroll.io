import { Skeleton } from '@/components/ui/skeleton'

export default function ShowDetailLoading() {
  return (
    <div>
      {/* Breadcrumb */}
      <Skeleton className="h-4 w-24 mb-2" />

      {/* Show header */}
      <div className="mt-2 flex items-start gap-4">
        <Skeleton className="w-14 h-14 shrink-0 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <Skeleton className="h-8 w-16 rounded-md" />
          <Skeleton className="h-8 w-12 rounded-md" />
        </div>
      </div>

      {/* Episodes section */}
      <section className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-4 w-24" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-20 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        </div>

        {/* Pipeline columns */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-24 w-full rounded-lg" />
              <Skeleton className="h-24 w-full rounded-lg" />
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

import { Skeleton } from '@/components/ui/skeleton'

function PropertyRow() {
  return (
    <div className="flex items-center justify-between px-5 py-3">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-4 w-36" />
    </div>
  )
}

export default function Loading() {
  return (
    <div>
      {/* Breadcrumb */}
      <Skeleton className="h-4 w-32 mb-4" />

      {/* Title + subtitle */}
      <div className="mb-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="mt-1.5 h-4 w-48" />
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 mb-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-24" />
        ))}
      </div>

      {/* Properties card */}
      <div className="rounded-lg border border-border-subtle bg-surface-raised divide-y divide-border-subtle mb-6">
        {Array.from({ length: 9 }).map((_, i) => (
          <PropertyRow key={i} />
        ))}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-border-subtle bg-surface-raised px-4 py-3 text-center"
          >
            <Skeleton className="mx-auto h-8 w-10" />
            <Skeleton className="mx-auto mt-1 h-3 w-16" />
          </div>
        ))}
      </div>

      {/* AI Add-on card */}
      <div className="rounded-lg border border-border-subtle bg-surface-raised divide-y divide-border-subtle mb-6">
        <div className="px-5 py-3">
          <Skeleton className="h-4 w-20" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <PropertyRow key={i} />
        ))}
      </div>

      {/* Members section */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-5 w-8 rounded-full" />
        </div>
        <div className="rounded-lg border border-border-subtle bg-surface-raised divide-y divide-border-subtle">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between px-5 py-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-5 w-14 rounded-full" />
              </div>
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

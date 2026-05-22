import { Skeleton } from '@/components/ui/skeleton'

function PropertyRow() {
  return (
    <div className="flex items-center justify-between px-5 py-3">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-4 w-40" />
    </div>
  )
}

export default function Loading() {
  return (
    <div>
      {/* Breadcrumb */}
      <Skeleton className="h-4 w-20 mb-4" />

      {/* Header: avatar + name */}
      <div className="mb-6 flex items-center gap-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-1 h-4 w-36" />
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 mb-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-8 w-32" />
      </div>

      {/* Properties card */}
      <div className="rounded-lg border border-border-subtle bg-surface-raised divide-y divide-border-subtle mb-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <PropertyRow key={i} />
        ))}
      </div>

      {/* Organizations section */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-5 w-8 rounded-full" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg border border-border-subtle bg-surface-raised px-5 py-3.5"
            >
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-5 w-14 rounded-full" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </div>
      </div>

      {/* API Keys section */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-5 w-8 rounded-full" />
        </div>
        <div className="rounded-lg border border-border-subtle bg-surface-raised divide-y divide-border-subtle">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between px-5 py-3">
              <Skeleton className="h-4 w-28" />
              <div className="flex items-center gap-4">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

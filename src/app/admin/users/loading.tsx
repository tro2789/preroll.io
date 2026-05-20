import { Skeleton } from '@/components/ui/skeleton'

function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div>
      {/* Header */}
      <div className="flex gap-4 px-4 py-3 border-b border-border-subtle">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-16" />
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-4 py-3 border-b border-border-subtle last:border-b-0"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div>
              <Skeleton className="h-4 w-28" />
              <Skeleton className="mt-1 h-3 w-36" />
            </div>
          </div>
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  )
}

export default function Loading() {
  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-6 w-12 rounded-full" />
      </div>

      {/* Search bar */}
      <div className="flex gap-2 mb-6">
        <Skeleton className="h-9 flex-1" />
        <Skeleton className="h-9 w-20" />
      </div>

      {/* Table */}
      <TableSkeleton rows={8} />
    </div>
  )
}

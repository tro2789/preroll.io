import { Skeleton } from '@/components/ui/skeleton'

function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-lg border border-border-subtle bg-surface-raised">
      {/* Header */}
      <div className="flex gap-4 px-4 py-3 border-b border-border-subtle">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-16" />
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-4 py-3 border-b border-border-subtle last:border-b-0"
        >
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  )
}

export default function Loading() {
  return (
    <div className="flex flex-col gap-8">
      {/* Episode Activity */}
      <div>
        <Skeleton className="h-6 w-40 mb-3" />
        <TableSkeleton rows={5} />
      </div>

      {/* AI Pipeline */}
      <div>
        <Skeleton className="h-6 w-28 mb-3" />
        <TableSkeleton rows={5} />
      </div>

      {/* Credit Activity */}
      <div>
        <Skeleton className="h-6 w-36 mb-3" />
        <TableSkeleton rows={5} />
      </div>
    </div>
  )
}

import { Skeleton } from '@/components/ui/skeleton'

function TableSkeleton({ cols, rows = 6 }: { cols: number; rows?: number }) {
  return (
    <div className="rounded-lg border border-border-subtle bg-surface-raised overflow-hidden">
      {/* Header */}
      <div className="flex gap-4 px-4 py-3 border-b border-border-subtle">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-24" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-4 py-3 border-b border-border-subtle last:border-b-0"
        >
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton
              key={j}
              className={`h-4 ${j === 0 ? 'w-28' : 'w-20'}`}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

export default function Loading() {
  return (
    <div>
      <Skeleton className="h-8 w-24 mb-6" />

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-border-subtle bg-surface-raised p-5"
          >
            <Skeleton className="h-9 w-12" />
            <Skeleton className="mt-2 h-3 w-24" />
          </div>
        ))}
      </div>

      {/* Subscription Status */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-5 w-10 rounded-full" />
        </div>
        <TableSkeleton cols={7} rows={6} />
      </div>

      {/* AI Credit Activity */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-5 w-10 rounded-full" />
        </div>
        <TableSkeleton cols={5} rows={6} />
      </div>
    </div>
  )
}

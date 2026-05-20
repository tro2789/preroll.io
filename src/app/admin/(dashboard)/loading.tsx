import { Skeleton } from '@/components/ui/skeleton'

function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-lg border border-border-subtle bg-surface-raised">
      <div className="flex gap-4 px-4 py-3 border-b border-border-subtle">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-20" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-4 py-3 border-b border-border-subtle last:border-b-0"
        >
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-5 w-14 rounded-full" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  )
}

export default function Loading() {
  return (
    <div className="flex flex-col gap-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-border-subtle bg-surface-raised p-5"
          >
            <Skeleton className="h-9 w-16" />
            <Skeleton className="mt-2 h-3 w-28" />
          </div>
        ))}
      </div>

      {/* Plan Distribution + Storage Overview */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-border-subtle bg-surface-raised p-5">
          <Skeleton className="h-6 w-36" />
          <div className="mt-4 flex flex-col gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-1">
                  <Skeleton className="h-5 w-14 rounded-full" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-border-subtle bg-surface-raised p-5">
          <Skeleton className="h-6 w-36" />
          <div className="mt-4 flex flex-col gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Signups */}
      <div>
        <Skeleton className="h-6 w-32 mb-3" />
        <TableSkeleton rows={5} />
      </div>

      {/* Recent Users */}
      <div>
        <Skeleton className="h-6 w-28 mb-3" />
        <TableSkeleton rows={5} />
      </div>
    </div>
  )
}

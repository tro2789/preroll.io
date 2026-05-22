import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div>
      <Skeleton className="h-8 w-28 mb-6" />

      {/* Super Admins */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-5 w-8 rounded-full" />
        </div>
        <div className="flex flex-col gap-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-lg border border-border-subtle bg-surface-raised px-5 py-3.5"
            >
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
                <Skeleton className="mt-1 h-3 w-40" />
              </div>
              <Skeleton className="h-3 w-28" />
            </div>
          ))}
        </div>
      </div>

      {/* API Keys */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-5 w-8 rounded-full" />
        </div>
        <div className="rounded-lg border border-border-subtle bg-surface-raised overflow-hidden">
          {/* Header */}
          <div className="flex gap-4 px-4 py-3 border-b border-border-subtle">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-20" />
          </div>
          {/* Rows */}
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 px-4 py-3 border-b border-border-subtle last:border-b-0"
            >
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

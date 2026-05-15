import { Skeleton } from '@/components/ui/skeleton'

export default function ShowsLoading() {
  return (
    <div>
      {/* Page header */}
      <div className="space-y-1.5 mb-4">
        <Skeleton className="h-7 w-20" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 py-3.5">
        <Skeleton className="h-7 w-16 rounded-[7px]" />
        <div className="flex-1" />
        <Skeleton className="h-7 w-32 rounded-[7px]" />
      </div>

      {/* Show cards grid */}
      <div className="grid gap-[14px] sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-[10px] border border-border-subtle bg-surface-raised overflow-hidden">
            <Skeleton className="aspect-[16/8] w-full rounded-none" />
            <div className="px-3.5 py-[13px] space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

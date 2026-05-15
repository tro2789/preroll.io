import { Skeleton } from '@/components/ui/skeleton'

export default function ClientsLoading() {
  return (
    <div>
      {/* Page header */}
      <div className="space-y-1.5 mb-4">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 py-3.5">
        <Skeleton className="h-7 w-24 rounded-[7px]" />
        <div className="flex-1" />
        <Skeleton className="h-7 w-32 rounded-[7px]" />
      </div>

      {/* Table skeleton */}
      <div className="rounded-[10px] border border-border-subtle bg-surface-raised overflow-hidden">
        <div className="px-3.5 py-[9px] border-b border-border-subtle flex gap-8">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-14" />
          <div className="flex-1" />
          <Skeleton className="h-3 w-10" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="px-3.5 py-2.5 border-b border-border-subtle last:border-b-0 flex items-center gap-8">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-24 hidden sm:block" />
            <Skeleton className="h-4 w-36 hidden md:block" />
            <div className="flex-1" />
            <Skeleton className="h-4 w-6" />
          </div>
        ))}
      </div>
    </div>
  )
}

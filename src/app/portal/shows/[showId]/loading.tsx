import { Skeleton } from '@/components/ui/skeleton'

export default function PortalShowLoading() {
  return (
    <div className="space-y-6">
      {/* Show hero */}
      <div className="flex items-center gap-4">
        <Skeleton className="w-16 h-16 rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-border-subtle pb-2">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-16" />
      </div>

      {/* Content */}
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    </div>
  )
}

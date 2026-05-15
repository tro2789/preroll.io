import { Skeleton } from '@/components/ui/skeleton'

export default function SettingsLoading() {
  return (
    <div className="max-w-2xl space-y-6">
      <Skeleton className="h-6 w-32" />

      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        ))}
      </div>

      <Skeleton className="h-10 w-24 rounded-md" />
    </div>
  )
}

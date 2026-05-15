export function OnboardingSkeleton() {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface-raised animate-pulse">
      <div className="flex items-center justify-between px-5 pt-4 pb-3">
        <div className="h-4 w-28 rounded bg-surface-overlay" />
        <div className="h-3 w-10 rounded bg-surface-overlay" />
      </div>
      <div className="mx-5 mb-4 h-1.5 rounded-full bg-surface-overlay" />
      <div className="px-5 pb-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-[18px] w-[18px] rounded-full bg-surface-overlay shrink-0" />
          <div className="h-3.5 w-24 rounded bg-surface-overlay" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-[18px] w-[18px] rounded-full bg-surface-overlay shrink-0" />
          <div className="h-3.5 w-20 rounded bg-surface-overlay" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-[18px] w-[18px] rounded-full bg-surface-overlay shrink-0" />
          <div className="h-3.5 w-28 rounded bg-surface-overlay" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-[18px] w-[18px] rounded-full bg-surface-overlay shrink-0" />
          <div className="h-3.5 w-44 rounded bg-surface-overlay" />
        </div>
      </div>
    </div>
  )
}

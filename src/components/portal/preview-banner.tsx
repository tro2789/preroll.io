export function PortalPreviewBanner({ clientName }: { clientName: string }) {
  return (
    <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-center">
      <p className="text-xs text-amber-400">
        You&apos;re previewing <span className="font-medium">{clientName}&apos;s</span> portal view
      </p>
    </div>
  )
}

import { formatFileSize, formatDuration } from '@/lib/format'

interface FilePickerItemProps {
  id: string
  name: string
  type: 'folder' | 'file' | 'project' | 'workspace'
  thumbnailUrl?: string
  fileSize?: number
  durationSeconds?: number
  selected?: boolean
  onNavigate?: () => void
  onSelect?: () => void
}

const typeIcons: Record<string, string> = {
  workspace: '■',
  project: '▣',
  folder: '▷',
  file: '●',
}

export function FilePickerItem({
  name,
  type,
  thumbnailUrl,
  fileSize,
  durationSeconds,
  selected,
  onNavigate,
  onSelect,
}: FilePickerItemProps) {
  const isNavigable = type === 'folder' || type === 'project' || type === 'workspace'
  const handleClick = isNavigable ? onNavigate : onSelect

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`w-full text-left rounded-lg border p-3 transition-colors group ${
        selected
          ? 'border-accent bg-accent/5'
          : 'border-border-subtle bg-surface-raised hover:border-border-default'
      }`}
    >
      <div className="flex items-center gap-3">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt=""
            className="w-10 h-10 rounded object-cover shrink-0"
          />
        ) : (
          <div className="w-10 h-10 rounded bg-surface-overlay flex items-center justify-center shrink-0">
            <span className="text-text-tertiary text-sm">{typeIcons[type] || typeIcons.file}</span>
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className={`text-sm truncate ${selected ? 'text-accent' : 'text-text-primary group-hover:text-accent'} transition-colors`}>
            {name}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-text-tertiary capitalize">{type}</span>
            {fileSize ? <span className="text-xs text-text-tertiary">{formatFileSize(fileSize)}</span> : null}
            {durationSeconds ? <span className="text-xs text-text-tertiary">{formatDuration(durationSeconds)}</span> : null}
          </div>
        </div>
        {isNavigable && (
          <span className="text-text-tertiary text-sm shrink-0">&rarr;</span>
        )}
      </div>
    </button>
  )
}

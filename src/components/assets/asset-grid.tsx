'use client'

type AssetType =
  | 'cover_art'
  | 'intro'
  | 'outro'
  | 'music_bed'
  | 'thumbnail'
  | 'show_notes'
  | 'clip'
  | 'other'

interface Asset {
  id: string
  name: string
  file_key: string
  asset_type: AssetType
  file_size?: number
  mime_type?: string
  created_at: string
}

interface AssetGridProps {
  assets: Asset[]
  onDelete?: (assetId: string) => void
}

const ASSET_TYPE_ICONS: Record<AssetType, string> = {
  cover_art: '\u{1F3A8}',
  intro: '\u{1F3B5}',
  outro: '\u{1F3B5}',
  music_bed: '\u{1F3B5}',
  thumbnail: '\u{1F4F8}',
  show_notes: '\u{1F4C4}',
  clip: '\u{1F3AC}',
  other: '\u{1F4CE}',
}

const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  cover_art: 'Cover Art',
  intro: 'Intro',
  outro: 'Outro',
  music_bed: 'Music Bed',
  thumbnail: 'Thumbnail',
  show_notes: 'Show Notes',
  clip: 'Clip',
  other: 'Other',
}

function formatFileSize(bytes?: number): string {
  if (bytes == null) return '--'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function AssetGrid({ assets, onDelete }: AssetGridProps) {
  if (assets.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        No assets yet. Upload one to get started.
      </p>
    )
  }

  // Group assets by type
  const grouped: Partial<Record<AssetType, Asset[]>> = {}
  for (const asset of assets) {
    const type = asset.asset_type as AssetType
    if (!grouped[type]) {
      grouped[type] = []
    }
    grouped[type]!.push(asset)
  }

  const typeOrder: AssetType[] = [
    'cover_art',
    'intro',
    'outro',
    'music_bed',
    'thumbnail',
    'show_notes',
    'clip',
    'other',
  ]

  return (
    <div className="space-y-8">
      {typeOrder.map((type) => {
        const group = grouped[type]
        if (!group || group.length === 0) return null

        return (
          <section key={type}>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 mb-3">
              {ASSET_TYPE_ICONS[type]} {ASSET_TYPE_LABELS[type]}{' '}
              <span className="text-zinc-500">({group.length})</span>
            </h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {group.map((asset) => (
                <div
                  key={asset.id}
                  className="rounded-lg border border-zinc-800 bg-zinc-800/50 p-4 transition-colors hover:border-zinc-700"
                >
                  <div className="text-2xl mb-2">
                    {ASSET_TYPE_ICONS[asset.asset_type as AssetType]}
                  </div>
                  <p
                    className="text-sm font-medium text-white truncate"
                    title={asset.name}
                  >
                    {asset.name}
                  </p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="inline-flex items-center rounded-full bg-indigo-900/50 px-2 py-0.5 text-xs font-medium text-indigo-300 border border-indigo-700/50">
                      {ASSET_TYPE_LABELS[asset.asset_type as AssetType]}
                    </span>
                    <span className="text-xs text-zinc-500">
                      {formatFileSize(asset.file_size)}
                    </span>
                  </div>
                  {onDelete && (
                    <button
                      type="button"
                      onClick={() => onDelete(asset.id)}
                      className="mt-3 text-xs text-red-400 hover:text-red-300 transition-colors"
                    >
                      Delete
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}

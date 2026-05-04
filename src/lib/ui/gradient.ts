const palette = [
  ['#6366f1', '#8b5cf6'],
  ['#3b82f6', '#6366f1'],
  ['#06b6d4', '#3b82f6'],
  ['#8b5cf6', '#ec4899'],
  ['#f59e0b', '#ef4444'],
  ['#10b981', '#06b6d4'],
  ['#ec4899', '#f43f5e'],
  ['#14b8a6', '#6366f1'],
  ['#f97316', '#f59e0b'],
  ['#a855f7', '#6366f1'],
]

function hashId(id: string): number {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

export function getGradient(id: string): string {
  const index = hashId(id) % palette.length
  const angle = (hashId(id + 'angle') % 4) * 45 + 120
  const [from, to] = palette[index]
  return `linear-gradient(${angle}deg, ${from}, ${to})`
}

const palette = [
  ['#f27052', '#e8446a'],
  ['#f5845a', '#f27052'],
  ['#f27052', '#c9455e'],
  ['#e06050', '#d4387a'],
  ['#f09060', '#e85d50'],
  ['#f5a070', '#f27052'],
  ['#e8446a', '#b84dca'],
  ['#f27052', '#d48040'],
  ['#d4587a', '#f27052'],
  ['#f08060', '#c95070'],
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

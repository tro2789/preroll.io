const palette: [number, number, number, number, number, number][] = [
  // [L1, C1, hueOffset1, L2, C2, hueOffset2]
  [0.55, 0.16, 0,   0.42, 0.18, 25],
  [0.58, 0.14, -15, 0.48, 0.17, 10],
  [0.50, 0.18, 10,  0.40, 0.15, -10],
  [0.55, 0.15, -20, 0.45, 0.16, 15],
  [0.60, 0.13, 5,   0.45, 0.18, -15],
  [0.52, 0.17, 20,  0.42, 0.14, 0],
  [0.48, 0.16, -10, 0.40, 0.18, 30],
  [0.57, 0.15, 15,  0.44, 0.17, -5],
  [0.50, 0.17, -5,  0.42, 0.15, 20],
  [0.56, 0.14, 10,  0.46, 0.16, -20],
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
  const [l1, c1, h1, l2, c2, h2] = palette[index]
  const hue = 'var(--gradient-hue)'
  return `linear-gradient(${angle}deg, oklch(${l1} ${c1} calc(${hue} + ${h1})), oklch(${l2} ${c2} calc(${hue} + ${h2})))`
}

export function formatTimecode(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function secsToFrameIoTimecode(secs: number): string {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = Math.floor(secs % 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}:00`
}

export function frameIoTimecodeToSecs(tc: string | number | null): number | null {
  if (tc == null) return null
  if (typeof tc === 'number') return tc / 24
  if (typeof tc === 'string' && tc.includes(':')) {
    const parts = tc.split(':').map(Number)
    if (parts.length < 3) return null
    let secs = parts[0] * 3600 + parts[1] * 60 + parts[2]
    if (parts.length === 4) secs += parts[3] / 24
    return secs
  }
  return null
}

export function resolveAssetUrl(keyOrUrl: string | null | undefined): string | null {
  if (!keyOrUrl) return null
  if (keyOrUrl.startsWith('http')) return keyOrUrl
  const base = process.env.NEXT_PUBLIC_R2_PUBLIC_URL
  return base ? `${base}/${keyOrUrl}` : null
}

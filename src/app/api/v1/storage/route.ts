import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'
import { getStorageUsage } from '@/lib/storage/usage'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const { org, error } = await getAuthenticatedClient()
  if (error) return error

  const usage = await getStorageUsage(org!.id, org!.planId, org!.trialEndsAt)

  const supabase = createServiceClient()
  const { data: files } = await supabase
    .from('file_references')
    .select('id, external_id, name, file_size, mime_type, created_at, episode_id, episodes(title, show_id, shows(name))')
    .eq('org_id', org!.id)
    .eq('provider', 'r2')
    .order('created_at', { ascending: false })

  const byShow = new Map<string, number>()
  const fileList: {
    id: string
    name: string
    size: number
    mimeType: string | null
    createdAt: string
    episodeId: string | null
    episodeTitle: string | null
    showName: string | null
  }[] = []

  for (const ref of files || []) {
    const episode = ref.episodes as unknown as { title: string; shows: { name: string } | null } | null
    const showName = episode?.shows?.name || 'Unlinked'
    byShow.set(showName, (byShow.get(showName) || 0) + (ref.file_size || 0))
    fileList.push({
      id: ref.id,
      name: ref.name,
      size: ref.file_size || 0,
      mimeType: ref.mime_type,
      createdAt: ref.created_at,
      episodeId: ref.episode_id,
      episodeTitle: episode?.title || null,
      showName,
    })
  }

  return jsonResponse({
    usedBytes: usage.usedBytes,
    limitBytes: usage.limitBytes,
    usedPercent: Math.round(usage.usedPercent * 10) / 10,
    remaining: usage.remaining,
    breakdown: Array.from(byShow.entries())
      .map(([show, bytes]) => ({ show, bytes }))
      .sort((a, b) => b.bytes - a.bytes),
    files: fileList,
  })
}

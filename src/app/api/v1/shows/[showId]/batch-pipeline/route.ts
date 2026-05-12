import { NextRequest } from 'next/server'
import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'
import { triggerAiPipeline, isAudioMimeType } from '@/lib/ai/pipeline'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ showId: string }> }
) {
  const { showId } = await params
  const { supabase, org, error } = await getAuthenticatedClient()
  if (error) return error

  const { data: show } = await supabase!
    .from('shows')
    .select('id, client_id, clients(org_id)')
    .eq('id', showId)
    .single()

  if (!show) return errorResponse('Show not found', 404)
  const showClient = show.clients as unknown as { org_id: string } | null
  if (!showClient || showClient.org_id !== org!.id) return errorResponse('Forbidden', 403)

  const { data: episodes } = await supabase!
    .from('episodes')
    .select('id, title')
    .eq('show_id', showId)
    .is('archived_at', null)
    .order('created_at', { ascending: false })

  if (!episodes || episodes.length === 0) {
    return jsonResponse({ processed: 0, results: [] })
  }

  const episodeIds = episodes.map(e => e.id)

  const [{ data: allRefs }, { data: allTranscriptions }] = await Promise.all([
    supabase!
      .from('file_references')
      .select('id, episode_id, external_id, mime_type, duration_seconds')
      .in('episode_id', episodeIds),
    supabase!
      .from('transcriptions')
      .select('episode_id')
      .in('episode_id', episodeIds)
      .in('status', ['completed', 'pending', 'processing']),
  ])

  const transcribedSet = new Set(allTranscriptions?.map(t => t.episode_id))

  const refsByEpisode = new Map<string, typeof allRefs>()
  for (const ref of allRefs || []) {
    if (!refsByEpisode.has(ref.episode_id)) refsByEpisode.set(ref.episode_id, [])
    refsByEpisode.get(ref.episode_id)!.push(ref)
  }

  const eligible: { episodeId: string; title: string; audioRef: { id: string; external_id: string; duration_seconds: number | null } }[] = []

  for (const ep of episodes) {
    if (transcribedSet.has(ep.id)) continue
    const refs = refsByEpisode.get(ep.id) || []
    const audioRef = refs.find(r => isAudioMimeType(r.mime_type))
    if (audioRef) {
      eligible.push({ episodeId: ep.id, title: ep.title, audioRef })
      if (eligible.length >= 5) break
    }
  }

  if (eligible.length === 0) {
    return jsonResponse({ processed: 0, results: [], message: 'No episodes with untranscribed audio found' })
  }

  const results: { episodeId: string; title: string; status: string; error?: string }[] = []

  for (const ep of eligible) {
    try {
      const result = await triggerAiPipeline({
        orgId: org!.id,
        episodeId: ep.episodeId,
        fileReferenceId: ep.audioRef.id,
        audioUrl: '',
        durationSeconds: ep.audioRef.duration_seconds || undefined,
        triggerSource: 'manual',
      })
      results.push({
        episodeId: ep.episodeId,
        title: ep.title,
        status: result.status,
      })
    } catch (err) {
      results.push({
        episodeId: ep.episodeId,
        title: ep.title,
        status: 'failed',
        error: (err as Error).message,
      })
    }
  }

  return jsonResponse({ processed: results.filter(r => !r.error).length, results })
}

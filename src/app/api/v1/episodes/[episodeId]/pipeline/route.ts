import { NextRequest } from 'next/server'
import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ episodeId: string }> }
) {
  const { episodeId } = await params
  const { supabase, org, error } = await getAuthenticatedClient()
  if (error) return error

  const { data: episode } = await supabase!
    .from('episodes')
    .select('id, shows(id, client_id, clients(org_id))')
    .eq('id', episodeId)
    .single()

  if (!episode) return errorResponse('Episode not found', 404)

  const show = episode.shows as unknown as { clients: { org_id: string } | null } | null
  if (!show?.clients || show.clients.org_id !== org!.id) return errorResponse('Forbidden', 403)

  const [{ data: jobs }, { data: generations }] = await Promise.all([
    supabase!
      .from('ai_pipeline_jobs')
      .select('*')
      .eq('episode_id', episodeId)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase!
      .from('ai_generations')
      .select('id, generation_type, result, credits_consumed, created_at')
      .eq('episode_id', episodeId)
      .order('created_at', { ascending: false }),
  ])

  return jsonResponse({
    pipeline: jobs?.[0] || null,
    jobs: jobs || [],
    generations: generations || [],
  })
}

import { NextRequest } from 'next/server'
import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'

export async function GET(request: NextRequest) {
  const { supabase, org, error } = await getAuthenticatedClient()
  if (error) return error

  const q = request.nextUrl.searchParams.get('q')?.trim()
  if (!q || q.length < 2) return jsonResponse({ episodes: [], shows: [], clients: [] })

  const safeQ = q.replace(/[%_,().]/g, '')
  if (!safeQ) return jsonResponse({ episodes: [], shows: [], clients: [] })

  const pattern = `%${safeQ}%`

  const [episodesResult, showsResult, clientsResult] = await Promise.all([
    supabase!
      .from('episodes')
      .select('id, title, episode_number, status, show_id, shows!inner(id, name, clients!inner(id, name, org_id))')
      .eq('shows.clients.org_id', org!.id)
      .ilike('title', pattern)
      .order('updated_at', { ascending: false })
      .limit(8),
    supabase!
      .from('shows')
      .select('id, name, cover_art_url, clients!inner(id, name, org_id)')
      .eq('clients.org_id', org!.id)
      .ilike('name', pattern)
      .order('name')
      .limit(5),
    supabase!
      .from('clients')
      .select('id, name, company')
      .eq('org_id', org!.id)
      .or(`name.ilike.${pattern},company.ilike.${pattern}`)
      .order('name')
      .limit(5),
  ])

  if (episodesResult.error || showsResult.error || clientsResult.error) {
    return errorResponse('Search failed', 500)
  }

  const episodes = (episodesResult.data || []).map(ep => {
    const showRaw = ep.shows as unknown
    const show = (Array.isArray(showRaw) ? showRaw[0] : showRaw) as { id: string; name: string } | null
    return {
      id: ep.id,
      title: ep.title,
      episode_number: ep.episode_number,
      status: ep.status,
      show_id: ep.show_id,
      show_name: show?.name || null,
    }
  })

  return jsonResponse({
    episodes,
    shows: showsResult.data || [],
    clients: clientsResult.data || [],
  })
}

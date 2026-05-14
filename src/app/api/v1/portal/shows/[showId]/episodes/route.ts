import { NextRequest } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { jsonResponse, errorResponse, getNextPositionInStage } from '@/lib/api/helpers'
import { cookies } from 'next/headers'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ showId: string }> }
) {
  const { showId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return errorResponse('Unauthorized', 401)

  const cookieStore = await cookies()
  const previewClientId = cookieStore.get('portal_preview_client_id')?.value

  const serviceClient = createServiceClient()

  const { data: show } = await serviceClient
    .from('shows')
    .select('id, name, client_id, clients!inner(id, client_user_id, org_id, name)')
    .eq('id', showId)
    .single()

  if (!show?.clients) return errorResponse('Show not found', 404)

  const client = show.clients as unknown as { id: string; client_user_id: string | null; org_id: string; name: string }
  const isClient = client.client_user_id === user.id
  const isPreview = previewClientId === client.id
  if (!isClient && !isPreview) return errorResponse('Forbidden', 403)

  const body = await request.json()
  const title = body.title?.trim()
  const notes = body.notes?.trim() || null
  const links: string[] = Array.isArray(body.links) ? body.links.filter((l: string) => l?.trim()) : []

  if (!title && links.length === 0) {
    return errorResponse('Provide a title or at least one link')
  }

  const { data: firstStage } = await serviceClient
    .from('pipeline_stages')
    .select('id, status_override')
    .eq('show_id', showId)
    .order('position', { ascending: true })
    .limit(1)
    .single()

  const stageId = firstStage?.id || null
  const status = firstStage?.status_override || 'planning'
  const position = stageId ? await getNextPositionInStage(serviceClient, stageId) : 0

  const linksBlock = links.length > 0
    ? '\n\n---\nContent links:\n' + links.map((l: string) => `- ${l.trim()}`).join('\n')
    : ''

  const fullNotes = (notes || '') + linksBlock

  const { data: episode, error: episodeError } = await serviceClient
    .from('episodes')
    .insert({
      show_id: showId,
      title: title || 'Untitled Episode',
      description: fullNotes || null,
      stage_id: stageId,
      status,
      position,
    })
    .select()
    .single()

  if (episodeError) return errorResponse(episodeError.message, 500)

  await serviceClient.from('activity_log').insert({
    org_id: client.org_id,
    show_id: showId,
    episode_id: episode.id,
    action: 'episode_submitted',
    description: `${client.name} submitted a new episode request: ${episode.title}`,
  })

  return jsonResponse(episode, 201)
}

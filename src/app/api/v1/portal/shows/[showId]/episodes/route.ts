import { NextRequest } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { jsonResponse, errorResponse, getNextPositionInStage } from '@/lib/api/helpers'
import { cookies } from 'next/headers'
import { sendEmail, getSiteUrl } from '@/lib/email/send'
import { emailTemplate, emailHighlightBlock } from '@/lib/email/template'

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
      client_submitted: true,
    })
    .select()
    .single()

  if (episodeError) return errorResponse(episodeError.message, 500)

  await serviceClient.from('activity_log').insert({
    show_id: showId,
    episode_id: episode.id,
    action: 'episode_submitted',
    description: `${client.name} submitted a new episode request: ${episode.title}`,
  })

  const { data: members } = await serviceClient
    .from('memberships')
    .select('user_id, user_profiles(email)')
    .eq('org_id', client.org_id)

  if (members && members.length > 0) {
    const siteUrl = getSiteUrl()
    const episodeUrl = `${siteUrl}/app/shows/${showId}/episodes/${episode.id}`
    const subject = `New episode request: ${episode.title}`
    const detailLines = [
      `<p style="margin: 0 0 8px; font-weight: 600;">${episode.title}</p>`,
      notes ? `<p style="margin: 0 0 8px; color: #6b7280;">${notes}</p>` : '',
      links.length > 0 ? `<p style="margin: 0; color: #6b7280;">Content links:<br/>${links.map((l: string) => `<a href="${l.trim()}" style="color: #e86a47;">${l.trim()}</a>`).join('<br/>')}</p>` : '',
    ].filter(Boolean).join('')
    const html = emailTemplate({
      body: `<p style="margin: 0 0 16px;"><strong>${client.name}</strong> submitted a new episode request for <strong>${show.name}</strong>.</p>${emailHighlightBlock(detailLines)}`,
      cta: { label: 'View Episode', url: episodeUrl },
    })

    for (const m of members) {
      const email = (m.user_profiles as unknown as { email: string } | null)?.email
      if (email) sendEmail(email, subject, html).catch(() => {})
    }
  }

  return jsonResponse(episode, 201)
}

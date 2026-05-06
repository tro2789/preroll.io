import { NextRequest } from 'next/server'
import { getAuthenticatedClient, jsonResponse, errorResponse, getNextPositionInStage } from '@/lib/api/helpers'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ showId: string }> }
) {
  const { showId } = await params
  const { supabase, error } = await getAuthenticatedClient()
  if (error) return error

  const status = request.nextUrl.searchParams.get('status')
  const stageId = request.nextUrl.searchParams.get('stage_id')

  let query = supabase!
    .from('episodes')
    .select('*')
    .eq('show_id', showId)
    .order('position', { ascending: true })
    .order('episode_number', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true })

  if (status) {
    query = query.eq('status', status)
  }
  if (stageId) {
    query = query.eq('stage_id', stageId)
  }

  const { data, error: dbError } = await query

  if (dbError) return errorResponse(dbError.message, 500)
  return jsonResponse(data)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ showId: string }> }
) {
  const { showId } = await params
  const { supabase, error } = await getAuthenticatedClient()
  if (error) return error

  const body = await request.json()
  if (!body.title) return errorResponse('title is required')

  let stageId = body.stage_id || null
  let status = 'planning'

  if (!stageId) {
    const { data: firstStage } = await supabase!
      .from('pipeline_stages')
      .select('id, name, status_override')
      .eq('show_id', showId)
      .order('position', { ascending: true })
      .limit(1)
      .single()

    if (firstStage) {
      stageId = firstStage.id
      status = firstStage.status_override || 'planning'
    }
  } else {
    const { data: stage } = await supabase!
      .from('pipeline_stages')
      .select('name, status_override')
      .eq('id', stageId)
      .single()

    if (stage) {
      status = stage.status_override || 'planning'
    }
  }

  const position = await getNextPositionInStage(supabase!, stageId)

  const { data, error: dbError } = await supabase!
    .from('episodes')
    .insert({
      show_id: showId,
      title: body.title,
      episode_number: body.episode_number ?? null,
      description: body.description || null,
      stage_id: stageId,
      status,
      position,
      scheduled_publish_date: body.scheduled_publish_date || null,
      frame_io_url: body.frame_io_url || null,
      notes: body.notes || null,
    })
    .select()
    .single()

  if (dbError) return errorResponse(dbError.message, 500)

  // Auto-create delivery project if user has an integration with createProject support
  try {
    const { data: { user } } = await supabase!.auth.getUser()
    if (user) {
      // Find a connected integration that supports project creation
      // Priority: frame_io > vimeo > google_drive
      const { data: integrations } = await supabase!
        .from('user_integrations')
        .select('provider, account_id, workspace_id')
        .eq('user_id', user.id)

      const priorityOrder = ['frame_io', 'vimeo', 'google_drive'] as const
      const eligible = priorityOrder
        .map(p => integrations?.find(i => i.provider === p))
        .find(i => i?.account_id && i?.workspace_id)

      if (eligible) {
        const { getValidToken } = await import('@/lib/integrations/token-refresh')
        const { getProvider } = await import('@/lib/integrations/registry')
        const { ensureProvidersRegistered } = await import('@/lib/integrations/init')
        ensureProvidersRegistered()

        const provider = getProvider(eligible.provider)
        if (provider.createProject && provider.capabilities.canCreateProject) {
          const token = await getValidToken(user.id, eligible.provider)

          const { data: show } = await supabase!
            .from('shows')
            .select('name, client_id, clients(name, company)')
            .eq('id', showId)
            .single()

          const showRecord = show as unknown as { name: string; clients: { name: string; company: string | null } | null } | null
          const date = new Date().toISOString().split('T')[0]
          const epNum = body.episode_number ? ` - EP${String(body.episode_number).padStart(2, '0')}` : ''
          const showName = showRecord?.name || 'Show'
          const projectName = `${date} - ${showName}${epNum} - ${body.title}`
          const clientName = showRecord?.clients?.company || showRecord?.clients?.name

          const project = await provider.createProject(token, eligible.account_id!, eligible.workspace_id!, projectName, {
            clientName: clientName || undefined,
            showName,
          })

          await supabase!
            .from('episode_integrations')
            .insert({
              episode_id: data.id,
              provider: eligible.provider,
              external_project_id: project.id,
              external_folder_id: project.rootFolderId,
              external_view_url: project.viewUrl,
            })
        }
      }
    }
  } catch (err) {
    console.error('Auto-create delivery project failed:', err instanceof Error ? err.message : err)
  }

  return jsonResponse(data, 201)
}


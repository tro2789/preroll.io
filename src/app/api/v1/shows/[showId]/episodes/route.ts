import { NextRequest } from 'next/server'
import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'

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

  // If no stage_id provided, default to the first stage (lowest position) for the show
  if (!stageId) {
    const { data: firstStage } = await supabase!
      .from('pipeline_stages')
      .select('id, name')
      .eq('show_id', showId)
      .order('position', { ascending: true })
      .limit(1)
      .single()

    if (firstStage) {
      stageId = firstStage.id
      status = mapStageNameToStatus(firstStage.name)
    }
  } else {
    // Look up the stage name to derive status
    const { data: stage } = await supabase!
      .from('pipeline_stages')
      .select('name')
      .eq('id', stageId)
      .single()

    if (stage) {
      status = mapStageNameToStatus(stage.name)
    }
  }

  const { data, error: dbError } = await supabase!
    .from('episodes')
    .insert({
      show_id: showId,
      title: body.title,
      episode_number: body.episode_number ?? null,
      description: body.description || null,
      stage_id: stageId,
      status,
      scheduled_publish_date: body.scheduled_publish_date || null,
      frame_io_url: body.frame_io_url || null,
      notes: body.notes || null,
    })
    .select()
    .single()

  if (dbError) return errorResponse(dbError.message, 500)

  // Auto-create Frame.io project if user has integration connected
  try {
    const { data: { user } } = await supabase!.auth.getUser()
    if (user) {
      const { data: integration } = await supabase!
        .from('user_integrations')
        .select('account_id, workspace_id')
        .eq('user_id', user.id)
        .eq('provider', 'frame_io')
        .single()

      if (integration?.account_id && integration?.workspace_id) {
        const { getValidToken } = await import('@/lib/integrations/token-refresh')
        const { getProvider } = await import('@/lib/integrations/registry')
        const { ensureProvidersRegistered } = await import('@/lib/integrations/init')
        ensureProvidersRegistered()

        const token = await getValidToken(user.id, 'frame_io')
        const provider = getProvider('frame_io')

        const { data: show } = await supabase!
          .from('shows')
          .select('name')
          .eq('id', showId)
          .single()

        const date = new Date().toISOString().split('T')[0]
        const epNum = body.episode_number ? ` - EP${String(body.episode_number).padStart(2, '0')}` : ''
        const projectName = `${date} - ${show?.name || 'Show'}${epNum} - ${body.title}`

        if (provider.createProject) {
          const project = await provider.createProject(token, integration.account_id, integration.workspace_id, projectName)
          await supabase!
            .from('episodes')
            .update({ frameio_project_id: project.id, frameio_root_folder_id: project.rootFolderId })
            .eq('id', data.id)

          data.frameio_project_id = project.id
          data.frameio_root_folder_id = project.rootFolderId
        }
      }
    }
  } catch (err) {
    console.error('Auto-create Frame.io project failed:', err instanceof Error ? err.message : err)
  }

  return jsonResponse(data, 201)
}

function mapStageNameToStatus(stageName: string): string {
  const validStatuses = ['planning', 'recording', 'editing', 'review', 'approved', 'published']
  const normalized = stageName.toLowerCase()
  if (validStatuses.includes(normalized)) {
    return normalized
  }
  return 'planning'
}

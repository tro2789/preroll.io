import { NextRequest } from 'next/server'
import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'
import { getProvider } from '@/lib/integrations/registry'
import { ensureProvidersRegistered } from '@/lib/integrations/init'
import { getValidToken } from '@/lib/integrations/token-refresh'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ episodeId: string }> }
) {
  const { episodeId } = await params
  const { supabase, user, error } = await getAuthenticatedClient()
  if (error) return error

  const { data: episode, error: dbError } = await supabase!
    .from('episodes')
    .select('id, title, frameio_project_id, frameio_root_folder_id, shows(id, name, client_id, clients(user_id))')
    .eq('id', episodeId)
    .single()

  if (dbError || !episode) return errorResponse('Episode not found', 404)

  const show = episode.shows as unknown as { name: string; clients: { user_id: string } } | null
  const client = show?.clients ?? null
  if (!client || client.user_id !== user!.id) return errorResponse('Forbidden', 403)

  return jsonResponse({
    episode_id: episode.id,
    frameio_project_id: episode.frameio_project_id,
    frameio_root_folder_id: episode.frameio_root_folder_id,
  })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ episodeId: string }> }
) {
  const { episodeId } = await params
  const { supabase, user, error } = await getAuthenticatedClient()
  if (error) return error

  // Fetch episode with show name and verify ownership
  const { data: episode, error: dbError } = await supabase!
    .from('episodes')
    .select('id, title, episode_number, frameio_project_id, shows(id, name, client_id, clients(user_id))')
    .eq('id', episodeId)
    .single()

  if (dbError || !episode) return errorResponse('Episode not found', 404)

  const show = episode.shows as unknown as { name: string; clients: { user_id: string } } | null
  const client = show?.clients ?? null
  if (!client || client.user_id !== user!.id) return errorResponse('Forbidden', 403)

  // Check if episode already has a Frame.io project
  if (episode.frameio_project_id) {
    return errorResponse('Episode already has a linked Frame.io project', 409)
  }

  ensureProvidersRegistered()

  try {
    // Get the user's Frame.io integration details (account_id and workspace_id)
    const { data: integration, error: integrationError } = await supabase!
      .from('user_integrations')
      .select('account_id, workspace_id')
      .eq('user_id', user!.id)
      .eq('provider', 'frame_io')
      .single()

    if (integrationError || !integration) {
      return errorResponse('No Frame.io integration found. Connect it in Settings.', 400)
    }

    if (!integration.account_id) {
      return errorResponse('Frame.io integration is missing account_id. Reconnect in Settings.', 400)
    }

    if (!integration.workspace_id) {
      return errorResponse('Frame.io integration is missing workspace_id. Set a workspace in Settings.', 400)
    }

    const token = await getValidToken(user!.id, 'frame_io')
    const provider = getProvider('frame_io')

    if (!provider.createProject) {
      return errorResponse('Frame.io provider does not support project creation', 500)
    }

    // Build project name: YYYY-MM-DD - {Show Name} - EP{episode_number}
    // Fall back to: {Show Name} - {Episode Title} if no episode number
    const showName = (show?.name as string) || 'Untitled Show'
    let projectName: string
    if (episode.episode_number) {
      const today = new Date().toISOString().split('T')[0]
      projectName = `${today} - ${showName} - EP${episode.episode_number}`
    } else {
      projectName = `${showName} - ${episode.title}`
    }

    const project = await provider.createProject(
      token,
      integration.account_id,
      integration.workspace_id,
      projectName
    )

    // Update the episode with Frame.io project details
    const { data: updated, error: updateError } = await supabase!
      .from('episodes')
      .update({
        frameio_project_id: project.id,
        frameio_root_folder_id: project.rootFolderId,
      })
      .eq('id', episodeId)
      .select('id, title, episode_number, frameio_project_id, frameio_root_folder_id')
      .single()

    if (updateError) return errorResponse(updateError.message, 500)

    return jsonResponse({
      ...updated,
      frameio_project_name: projectName,
      frameio_view_url: project.viewUrl,
    }, 201)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create Frame.io project'
    return errorResponse(message, 500)
  }
}

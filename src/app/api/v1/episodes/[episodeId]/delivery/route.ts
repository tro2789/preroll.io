import { NextRequest } from 'next/server'
import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'
import { getProvider } from '@/lib/integrations/registry'
import { ensureProvidersRegistered } from '@/lib/integrations/init'
import { getValidToken } from '@/lib/integrations/token-refresh'
import type { IntegrationProvider } from '@/lib/integrations/types'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ episodeId: string }> }
) {
  const { episodeId } = await params
  const { supabase, user, error } = await getAuthenticatedClient()
  if (error) return error

  const { data: episode, error: dbError } = await supabase!
    .from('episodes')
    .select('id, shows(id, client_id, clients(user_id))')
    .eq('id', episodeId)
    .single()

  if (dbError || !episode) return errorResponse('Episode not found', 404)

  const show = episode.shows as unknown as { clients: { user_id: string } | null } | null
  if (!show?.clients || show.clients.user_id !== user!.id) return errorResponse('Forbidden', 403)

  const { data: integration } = await supabase!
    .from('episode_integrations')
    .select('*')
    .eq('episode_id', episodeId)
    .maybeSingle()

  if (!integration) {
    return jsonResponse({ connected: false, integration: null })
  }

  ensureProvidersRegistered()
  const provider = getProvider(integration.provider)

  return jsonResponse({
    connected: true,
    integration: {
      provider: integration.provider,
      external_project_id: integration.external_project_id,
      external_folder_id: integration.external_folder_id,
      external_view_url: integration.external_view_url,
      capabilities: provider.capabilities,
      display_name: provider.displayName,
    },
  })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ episodeId: string }> }
) {
  const { episodeId } = await params
  const { supabase, user, error } = await getAuthenticatedClient()
  if (error) return error

  const body = await request.json().catch(() => ({}))

  const { data: episode, error: dbError } = await supabase!
    .from('episodes')
    .select('id, title, episode_number, shows(id, name, client_id, clients(user_id))')
    .eq('id', episodeId)
    .single()

  if (dbError || !episode) return errorResponse('Episode not found', 404)

  const show = episode.shows as unknown as { name: string; clients: { user_id: string } } | null
  if (!show?.clients || show.clients.user_id !== user!.id) return errorResponse('Forbidden', 403)

  // No switching: reject if already connected
  const { data: existing } = await supabase!
    .from('episode_integrations')
    .select('id')
    .eq('episode_id', episodeId)
    .maybeSingle()

  if (existing) {
    return errorResponse('Episode already has a delivery provider connected', 409)
  }

  // Determine which provider to use
  let providerName: IntegrationProvider
  if (body.provider) {
    providerName = body.provider
  } else {
    // Auto-select: fetch user's connected integrations
    const { data: integrations } = await supabase!
      .from('user_integrations')
      .select('provider')
      .eq('user_id', user!.id)

    const connected = integrations?.map(i => i.provider as IntegrationProvider) || []
    if (connected.length === 0) {
      return errorResponse('No integrations connected. Connect one in Settings.', 400)
    }
    if (connected.length > 1) {
      return errorResponse('Multiple providers connected. Specify which one with { provider }.', 400)
    }
    providerName = connected[0]
  }

  ensureProvidersRegistered()

  try {
    const { data: userIntegration, error: integrationError } = await supabase!
      .from('user_integrations')
      .select('account_id, workspace_id')
      .eq('user_id', user!.id)
      .eq('provider', providerName)
      .single()

    if (integrationError || !userIntegration) {
      return errorResponse(`No ${providerName} integration found. Connect it in Settings.`, 400)
    }

    if (!userIntegration.account_id) {
      return errorResponse(`${providerName} integration is missing account_id. Reconnect in Settings.`, 400)
    }

    const provider = getProvider(providerName)
    let externalProjectId: string | null = null
    let externalFolderId: string | null = null
    let externalViewUrl: string | null = null

    if (provider.createProject && provider.capabilities.canCreateProject) {
      if (!userIntegration.workspace_id) {
        return errorResponse(`${providerName} integration is missing workspace_id. Reconnect in Settings.`, 400)
      }

      const token = await getValidToken(user!.id, providerName)
      const showName = show.name || 'Untitled Show'
      let projectName: string
      if (episode.episode_number) {
        const today = new Date().toISOString().split('T')[0]
        projectName = `${today} - ${showName} - EP${episode.episode_number}`
      } else {
        projectName = `${showName} - ${episode.title}`
      }

      const project = await provider.createProject(
        token,
        userIntegration.account_id,
        userIntegration.workspace_id,
        projectName
      )

      externalProjectId = project.id
      externalFolderId = project.rootFolderId
      externalViewUrl = project.viewUrl
    }

    const { data: inserted, error: insertError } = await supabase!
      .from('episode_integrations')
      .insert({
        episode_id: episodeId,
        provider: providerName,
        external_project_id: externalProjectId,
        external_folder_id: externalFolderId,
        external_view_url: externalViewUrl,
      })
      .select()
      .single()

    if (insertError) return errorResponse(insertError.message, 500)

    return jsonResponse({
      connected: true,
      integration: {
        ...inserted,
        capabilities: provider.capabilities,
        display_name: provider.displayName,
      },
    }, 201)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to connect delivery provider'
    return errorResponse(message, 500)
  }
}

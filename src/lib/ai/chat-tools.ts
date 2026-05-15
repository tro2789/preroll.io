import type Anthropic from '@anthropic-ai/sdk'
import { createServiceClient } from '@/lib/supabase/server'
import type { GenerationType, AiTone, AiLength } from '@/lib/ai/constants'

type Tool = Anthropic.Messages.Tool

export interface ToolContext {
  orgId: string
  userId: string
}

export interface ToolResult {
  result: unknown
  requiresConfirmation?: boolean
  actionType?: string
  actionDescription?: string
  actionData?: Record<string, unknown>
}

// ============================================================
// Tool definitions (sent to Claude)
// ============================================================

const readTools: Tool[] = [
  {
    name: 'get_dashboard',
    description: 'Get dashboard overview: in-progress episodes, upcoming deadlines, recent activity, and stats',
    input_schema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'list_clients',
    description: 'List all clients in the organization',
    input_schema: {
      type: 'object' as const,
      properties: {
        search: { type: 'string', description: 'Search by name or company' },
      },
    },
  },
  {
    name: 'get_client',
    description: 'Get a client by ID with full details',
    input_schema: {
      type: 'object' as const,
      properties: {
        client_id: { type: 'string' },
      },
      required: ['client_id'],
    },
  },
  {
    name: 'list_shows',
    description: 'List shows, optionally filtered by client',
    input_schema: {
      type: 'object' as const,
      properties: {
        client_id: { type: 'string', description: 'Filter by client UUID' },
      },
    },
  },
  {
    name: 'get_show',
    description: 'Get a show by ID with pipeline stages',
    input_schema: {
      type: 'object' as const,
      properties: {
        show_id: { type: 'string' },
      },
      required: ['show_id'],
    },
  },
  {
    name: 'list_episodes',
    description: 'List episodes with optional filters',
    input_schema: {
      type: 'object' as const,
      properties: {
        show_id: { type: 'string', description: 'Filter by show UUID' },
        status: { type: 'string', description: 'Filter by status' },
        from: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
        to: { type: 'string', description: 'End date (YYYY-MM-DD)' },
      },
    },
  },
  {
    name: 'get_episode',
    description: 'Get full episode details including pipeline stage, files, and AI content',
    input_schema: {
      type: 'object' as const,
      properties: {
        episode_id: { type: 'string' },
      },
      required: ['episode_id'],
    },
  },
  {
    name: 'list_deliverables',
    description: 'List shared files/deliverables with optional filters',
    input_schema: {
      type: 'object' as const,
      properties: {
        episode_id: { type: 'string', description: 'Filter by episode' },
        status: { type: 'string', description: 'pending, approved, or revision_requested' },
      },
    },
  },
  {
    name: 'get_activity',
    description: 'Get recent activity feed',
    input_schema: {
      type: 'object' as const,
      properties: {
        show_id: { type: 'string', description: 'Filter by show' },
        limit: { type: 'number', description: 'Max entries (default 20)' },
      },
    },
  },
  {
    name: 'get_ai_status',
    description: 'Get AI credit usage: monthly allowance, purchased credits, recent usage',
    input_schema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'list_stages',
    description: 'List pipeline stages for a show (needed for moving episodes)',
    input_schema: {
      type: 'object' as const,
      properties: {
        show_id: { type: 'string' },
      },
      required: ['show_id'],
    },
  },
  {
    name: 'list_tags',
    description: 'List all tags in the organization',
    input_schema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'list_notes',
    description: 'List meeting notes for a client',
    input_schema: {
      type: 'object' as const,
      properties: {
        client_id: { type: 'string' },
      },
      required: ['client_id'],
    },
  },
]

const writeTools: Tool[] = [
  {
    name: 'create_episode',
    description: 'Create a new episode for a show',
    input_schema: {
      type: 'object' as const,
      properties: {
        show_id: { type: 'string' },
        title: { type: 'string' },
        episode_number: { type: 'number' },
        description: { type: 'string' },
        notes: { type: 'string' },
        scheduled_publish_date: { type: 'string', description: 'YYYY-MM-DD' },
      },
      required: ['show_id', 'title'],
    },
  },
  {
    name: 'update_episode',
    description: 'Update episode details',
    input_schema: {
      type: 'object' as const,
      properties: {
        episode_id: { type: 'string' },
        title: { type: 'string' },
        description: { type: 'string' },
        notes: { type: 'string' },
        scheduled_publish_date: { type: 'string', description: 'YYYY-MM-DD' },
        stage_id: { type: 'string', description: 'Pipeline stage UUID — moves episode to this stage' },
      },
      required: ['episode_id'],
    },
  },
  {
    name: 'create_client',
    description: 'Create a new client',
    input_schema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string' },
        company: { type: 'string' },
        email: { type: 'string' },
        phone: { type: 'string' },
        notes: { type: 'string' },
      },
      required: ['name', 'email'],
    },
  },
  {
    name: 'create_show',
    description: 'Create a new show for a client (auto-creates default pipeline stages)',
    input_schema: {
      type: 'object' as const,
      properties: {
        client_id: { type: 'string' },
        name: { type: 'string' },
        description: { type: 'string' },
        format: { type: 'string', description: 'interview, solo, panel, narrative, or other' },
        schedule: { type: 'string', description: 'e.g. "Weekly on Tuesdays"' },
      },
      required: ['client_id', 'name'],
    },
  },
  {
    name: 'create_deliverable',
    description: 'Share a file with the client (create deliverable)',
    input_schema: {
      type: 'object' as const,
      properties: {
        show_id: { type: 'string' },
        episode_id: { type: 'string' },
        title: { type: 'string' },
        type: { type: 'string', description: 'rough_cut, final_cut, thumbnail, show_notes, cover_art, social_clip, or other' },
        description: { type: 'string' },
        file_url: { type: 'string' },
      },
      required: ['show_id', 'title'],
    },
  },
  {
    name: 'create_note',
    description: 'Add a meeting note to a client',
    input_schema: {
      type: 'object' as const,
      properties: {
        client_id: { type: 'string' },
        title: { type: 'string' },
        content: { type: 'string' },
        meeting_date: { type: 'string', description: 'YYYY-MM-DD' },
      },
      required: ['client_id', 'content'],
    },
  },
  {
    name: 'create_tag',
    description: 'Create a tag',
    input_schema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string' },
        color: { type: 'string', description: 'Hex color, e.g. #6366f1' },
      },
      required: ['name'],
    },
  },
  {
    name: 'generate_content',
    description: 'Generate AI content for an episode (requires existing transcript). Types: show_notes, description, social_twitter, social_linkedin, social_instagram, title_suggestions',
    input_schema: {
      type: 'object' as const,
      properties: {
        episode_id: { type: 'string' },
        type: { type: 'string', description: 'show_notes, description, social_twitter, social_linkedin, social_instagram, or title_suggestions' },
      },
      required: ['episode_id', 'type'],
    },
  },
  {
    name: 'transcribe_episode',
    description: 'Start transcription for an episode (requires audio file linked to the episode)',
    input_schema: {
      type: 'object' as const,
      properties: {
        episode_id: { type: 'string' },
      },
      required: ['episode_id'],
    },
  },
]

export const WRITE_TOOL_NAMES = new Set(writeTools.map((t) => t.name))

export function getAllTools(): Tool[] {
  return [...readTools, ...writeTools]
}

// ============================================================
// Tool execution
// ============================================================

export async function executeTool(
  toolName: string,
  input: Record<string, unknown>,
  ctx: ToolContext
): Promise<ToolResult> {
  const supabase = createServiceClient()

  switch (toolName) {
    // ----- Read tools -----

    case 'get_dashboard': {
      const today = new Date()
      const nextTwoWeeks = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000)
      const todayStr = today.toISOString().split('T')[0]
      const nextTwoWeeksStr = nextTwoWeeks.toISOString().split('T')[0]

      const [inProgress, deadlines, activity, stats] = await Promise.all([
        supabase
          .from('episodes')
          .select('id, title, episode_number, status, scheduled_publish_date, updated_at, pipeline_stages(name), shows!inner(id, name, clients!inner(org_id))')
          .eq('shows.clients.org_id', ctx.orgId)
          .neq('status', 'published')
          .order('updated_at', { ascending: false })
          .limit(12),
        supabase
          .from('episodes')
          .select('id, title, episode_number, status, scheduled_publish_date, shows!inner(id, name, clients!inner(org_id)), pipeline_stages(name)')
          .eq('shows.clients.org_id', ctx.orgId)
          .gte('scheduled_publish_date', todayStr)
          .lte('scheduled_publish_date', nextTwoWeeksStr)
          .neq('status', 'published')
          .order('scheduled_publish_date', { ascending: true })
          .limit(8),
        supabase
          .from('activity_log')
          .select('id, action, description, created_at, show_id, shows!inner(name, clients!inner(org_id))')
          .eq('shows.clients.org_id', ctx.orgId)
          .order('created_at', { ascending: false })
          .limit(8),
        Promise.all([
          supabase.from('clients').select('id', { count: 'exact', head: true }).eq('org_id', ctx.orgId),
          supabase.from('shows').select('*, clients!inner(org_id)', { count: 'exact', head: true }).eq('clients.org_id', ctx.orgId),
          supabase.from('deliverables').select('*, shows!inner(clients!inner(org_id))', { count: 'exact', head: true }).eq('shows.clients.org_id', ctx.orgId).eq('status', 'pending'),
        ]),
      ])

      return {
        result: {
          episodes_in_progress: inProgress.data,
          upcoming_deadlines: deadlines.data,
          recent_activity: activity.data,
          stats: {
            client_count: stats[0].count ?? 0,
            show_count: stats[1].count ?? 0,
            pending_deliverables: stats[2].count ?? 0,
          },
        },
      }
    }

    case 'list_clients': {
      let query = supabase.from('clients').select('id, name, company, email, phone').eq('org_id', ctx.orgId).order('name')
      if (input.search) {
        query = query.or(`name.ilike.%${input.search}%,company.ilike.%${input.search}%`)
      }
      const { data, error } = await query
      if (error) return { result: { error: error.message } }
      return { result: data }
    }

    case 'get_client': {
      const { data, error } = await supabase
        .from('clients')
        .select('*, shows(id, name, format, schedule)')
        .eq('id', input.client_id as string)
        .eq('org_id', ctx.orgId)
        .single()
      if (error) return { result: { error: error.message } }
      return { result: data }
    }

    case 'list_shows': {
      let query = supabase.from('shows').select('id, name, format, schedule, client_id, clients!inner(org_id, name)').eq('clients.org_id', ctx.orgId).order('name')
      if (input.client_id) {
        query = query.eq('client_id', input.client_id as string)
      }
      const { data, error } = await query
      if (error) return { result: { error: error.message } }
      return { result: data }
    }

    case 'get_show': {
      const { data, error } = await supabase
        .from('shows')
        .select('*, clients!inner(org_id, name), pipeline_stages(id, name, position, status_override)')
        .eq('id', input.show_id as string)
        .eq('clients.org_id', ctx.orgId)
        .single()
      if (error) return { result: { error: error.message } }
      return { result: data }
    }

    case 'list_episodes': {
      let query = supabase
        .from('episodes')
        .select('id, title, episode_number, status, scheduled_publish_date, show_id, stage_id, pipeline_stages(name), shows!inner(id, name, clients!inner(org_id))')
        .eq('shows.clients.org_id', ctx.orgId)
        .order('scheduled_publish_date', { ascending: true, nullsFirst: false })
        .limit(50)

      if (input.show_id) query = query.eq('show_id', input.show_id as string)
      if (input.status) query = query.eq('status', input.status as string)
      if (input.from) query = query.gte('scheduled_publish_date', input.from as string)
      if (input.to) query = query.lte('scheduled_publish_date', input.to as string)

      const { data, error } = await query
      if (error) return { result: { error: error.message } }
      return { result: data }
    }

    case 'get_episode': {
      const { data, error } = await supabase
        .from('episodes')
        .select('*, pipeline_stages(id, name), shows!inner(id, name, clients!inner(org_id))')
        .eq('id', input.episode_id as string)
        .eq('shows.clients.org_id', ctx.orgId)
        .single()
      if (error) return { result: { error: error.message } }

      const [{ data: deliverables }, { data: transcription }] = await Promise.all([
        supabase.from('deliverables').select('id, title, type, status').eq('episode_id', input.episode_id as string).order('created_at', { ascending: false }),
        supabase.from('transcriptions').select('id, status, created_at').eq('episode_id', input.episode_id as string).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      ])

      return { result: { ...data, deliverables, transcription } }
    }

    case 'list_deliverables': {
      let query = supabase
        .from('deliverables')
        .select('id, title, type, status, episode_id, reviewer_notes, created_at, shows!inner(clients!inner(org_id))')
        .eq('shows.clients.org_id', ctx.orgId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (input.episode_id) query = query.eq('episode_id', input.episode_id as string)
      if (input.status) query = query.eq('status', input.status as string)

      const { data, error } = await query
      if (error) return { result: { error: error.message } }
      return { result: data }
    }

    case 'get_activity': {
      let query = supabase
        .from('activity_log')
        .select('id, action, description, created_at, show_id, shows!inner(name, clients!inner(org_id))')
        .eq('shows.clients.org_id', ctx.orgId)
        .order('created_at', { ascending: false })
        .limit((input.limit as number) || 20)

      if (input.show_id) query = query.eq('show_id', input.show_id as string)

      const { data, error } = await query
      if (error) return { result: { error: error.message } }
      return { result: data }
    }

    case 'get_ai_status': {
      const { getAiAddonStatus, totalAvailableCredits } = await import('@/lib/ai/entitlements')
      const addon = await getAiAddonStatus(ctx.orgId)
      return {
        result: {
          enabled: addon.enabled,
          monthly_allowance: addon.monthlyAllowance,
          monthly_used: addon.monthlyUsed,
          monthly_remaining: addon.monthlyRemaining,
          purchased_credits: addon.creditsBalance,
          total_available: totalAvailableCredits(addon),
        },
      }
    }

    case 'list_stages': {
      const { data, error } = await supabase
        .from('pipeline_stages')
        .select('id, name, position, status_override, shows!inner(clients!inner(org_id))')
        .eq('show_id', input.show_id as string)
        .eq('shows.clients.org_id', ctx.orgId)
        .order('position')
      if (error) return { result: { error: error.message } }
      return { result: data }
    }

    case 'list_tags': {
      const { data, error } = await supabase.from('tags').select('id, name, color').eq('org_id', ctx.orgId).order('name')
      if (error) return { result: { error: error.message } }
      return { result: data }
    }

    case 'list_notes': {
      const { data, error } = await supabase
        .from('meeting_notes')
        .select('id, title, content, meeting_date, created_at')
        .eq('client_id', input.client_id as string)
        .order('meeting_date', { ascending: false })
        .limit(20)
      if (error) return { result: { error: error.message } }
      return { result: data }
    }

    // ----- Write tools (return confirmation) -----

    case 'create_episode': {
      const showId = input.show_id as string
      const { data: show } = await supabase
        .from('shows')
        .select('id, name, clients!inner(org_id)')
        .eq('id', showId)
        .eq('clients.org_id', ctx.orgId)
        .single()
      if (!show) return { result: { error: 'Show not found' } }

      return {
        result: { preview: `Create episode "${input.title}" for show "${show.name}"` },
        requiresConfirmation: true,
        actionType: 'create_episode',
        actionDescription: `Create episode "${input.title}" for ${show.name}`,
        actionData: { show_id: showId, title: input.title, episode_number: input.episode_number, description: input.description, notes: input.notes, scheduled_publish_date: input.scheduled_publish_date },
      }
    }

    case 'update_episode': {
      const episodeId = input.episode_id as string
      const { data: episode } = await supabase
        .from('episodes')
        .select('id, title, shows!inner(clients!inner(org_id))')
        .eq('id', episodeId)
        .eq('shows.clients.org_id', ctx.orgId)
        .single()
      if (!episode) return { result: { error: 'Episode not found' } }

      const updates: Record<string, unknown> = {}
      for (const key of ['title', 'description', 'notes', 'scheduled_publish_date', 'stage_id']) {
        if (input[key] !== undefined) updates[key] = input[key]
      }

      const changes = Object.keys(updates).join(', ')
      return {
        result: { preview: `Update ${changes} on "${episode.title}"` },
        requiresConfirmation: true,
        actionType: 'update_episode',
        actionDescription: `Update ${changes} on "${episode.title}"`,
        actionData: { episode_id: episodeId, ...updates },
      }
    }

    case 'create_client': {
      return {
        result: { preview: `Create client "${input.name}"${input.company ? ` (${input.company})` : ''}` },
        requiresConfirmation: true,
        actionType: 'create_client',
        actionDescription: `Create client "${input.name}"`,
        actionData: { name: input.name, company: input.company, email: input.email, phone: input.phone, notes: input.notes },
      }
    }

    case 'create_show': {
      const { data: client } = await supabase
        .from('clients')
        .select('id, name')
        .eq('id', input.client_id as string)
        .eq('org_id', ctx.orgId)
        .single()
      if (!client) return { result: { error: 'Client not found' } }

      return {
        result: { preview: `Create show "${input.name}" for client "${client.name}"` },
        requiresConfirmation: true,
        actionType: 'create_show',
        actionDescription: `Create show "${input.name}" for ${client.name}`,
        actionData: { client_id: input.client_id, name: input.name, description: input.description, format: input.format, schedule: input.schedule },
      }
    }

    case 'create_deliverable': {
      return {
        result: { preview: `Share "${input.title}" with client` },
        requiresConfirmation: true,
        actionType: 'create_deliverable',
        actionDescription: `Share "${input.title}" with client`,
        actionData: { show_id: input.show_id, episode_id: input.episode_id, title: input.title, type: input.type, description: input.description, file_url: input.file_url },
      }
    }

    case 'create_note': {
      return {
        result: { preview: `Add meeting note${input.title ? `: "${input.title}"` : ''} for client` },
        requiresConfirmation: true,
        actionType: 'create_note',
        actionDescription: `Add meeting note${input.title ? `: "${input.title}"` : ''}`,
        actionData: { client_id: input.client_id, title: input.title, content: input.content, meeting_date: input.meeting_date },
      }
    }

    case 'create_tag': {
      return {
        result: { preview: `Create tag "${input.name}"` },
        requiresConfirmation: true,
        actionType: 'create_tag',
        actionDescription: `Create tag "${input.name}"`,
        actionData: { name: input.name, color: input.color },
      }
    }

    case 'generate_content': {
      return {
        result: { preview: `Generate ${input.type} for this episode` },
        requiresConfirmation: true,
        actionType: 'generate_content',
        actionDescription: `Generate ${input.type}`,
        actionData: { episode_id: input.episode_id, type: input.type },
      }
    }

    case 'transcribe_episode': {
      return {
        result: { preview: 'Start transcription for this episode' },
        requiresConfirmation: true,
        actionType: 'transcribe_episode',
        actionDescription: 'Start transcription',
        actionData: { episode_id: input.episode_id },
      }
    }

    default:
      return { result: { error: `Unknown tool: ${toolName}` } }
  }
}

// ============================================================
// Action execution (after user confirms)
// ============================================================

export async function executeAction(
  actionType: string,
  actionData: Record<string, unknown>,
  ctx: ToolContext
): Promise<{ result: unknown; error?: string }> {
  const supabase = createServiceClient()

  switch (actionType) {
    case 'create_episode': {
      const { data: firstStage } = await supabase
        .from('pipeline_stages')
        .select('id')
        .eq('show_id', actionData.show_id as string)
        .order('position')
        .limit(1)
        .single()

      const { data, error } = await supabase
        .from('episodes')
        .insert({
          show_id: actionData.show_id,
          title: actionData.title,
          episode_number: actionData.episode_number || null,
          description: actionData.description || null,
          notes: actionData.notes || null,
          scheduled_publish_date: actionData.scheduled_publish_date || null,
          stage_id: firstStage?.id || null,
          status: 'planning',
          user_id: ctx.userId,
        })
        .select()
        .single()
      if (error) return { result: null, error: error.message }
      return { result: data }
    }

    case 'update_episode': {
      const { episode_id, ...updates } = actionData
      const { data, error } = await supabase
        .from('episodes')
        .update(updates)
        .eq('id', episode_id as string)
        .select()
        .single()
      if (error) return { result: null, error: error.message }
      return { result: data }
    }

    case 'create_client': {
      const { data, error } = await supabase
        .from('clients')
        .insert({
          user_id: ctx.userId,
          org_id: ctx.orgId,
          name: actionData.name,
          company: actionData.company || null,
          email: actionData.email || null,
          phone: actionData.phone || null,
          notes: actionData.notes || null,
        })
        .select()
        .single()
      if (error) return { result: null, error: error.message }
      return { result: data }
    }

    case 'create_show': {
      const { data: show, error: showError } = await supabase
        .from('shows')
        .insert({
          client_id: actionData.client_id,
          name: actionData.name,
          description: actionData.description || null,
          format: actionData.format || null,
          schedule: actionData.schedule || null,
        })
        .select()
        .single()
      if (showError) return { result: null, error: showError.message }

      const defaultStages = [
        { show_id: show.id, name: 'Submitted', position: 1, status_override: 'submitted' },
        { show_id: show.id, name: 'Editing', position: 2, status_override: 'editing' },
        { show_id: show.id, name: 'Review', position: 3, status_override: 'review' },
        { show_id: show.id, name: 'Approved', position: 4, status_override: 'approved' },
        { show_id: show.id, name: 'Published', position: 5, status_override: 'published' },
      ]
      await supabase.from('pipeline_stages').insert(defaultStages)

      return { result: show }
    }

    case 'create_deliverable': {
      const { data, error } = await supabase
        .from('deliverables')
        .insert({
          show_id: actionData.show_id,
          episode_id: actionData.episode_id || null,
          title: actionData.title,
          type: actionData.type || 'other',
          description: actionData.description || null,
          file_url: actionData.file_url || null,
          status: 'pending',
          user_id: ctx.userId,
        })
        .select()
        .single()
      if (error) return { result: null, error: error.message }
      return { result: data }
    }

    case 'create_note': {
      const { data, error } = await supabase
        .from('meeting_notes')
        .insert({
          client_id: actionData.client_id,
          user_id: ctx.userId,
          title: actionData.title || null,
          content: actionData.content,
          meeting_date: actionData.meeting_date || new Date().toISOString().split('T')[0],
        })
        .select()
        .single()
      if (error) return { result: null, error: error.message }
      return { result: data }
    }

    case 'create_tag': {
      const { data, error } = await supabase
        .from('tags')
        .insert({
          org_id: ctx.orgId,
          name: actionData.name,
          color: actionData.color || '#6366f1',
        })
        .select()
        .single()
      if (error) return { result: null, error: error.message }
      return { result: data }
    }

    case 'generate_content': {
      const { getAiAddonStatus, getAnthropicApiKey, consumeCredits } = await import('@/lib/ai/entitlements')
      const { generate } = await import('@/lib/ai/generate')
      const { CREDIT_COSTS } = await import('@/lib/ai/constants')

      const genType = actionData.type as GenerationType
      const addon = await getAiAddonStatus(ctx.orgId)
      const cost = CREDIT_COSTS[genType] || 1

      const { data: episode } = await supabase
        .from('episodes')
        .select('id, title, description, notes, show_id, shows(name, description, ai_tone, ai_length)')
        .eq('id', actionData.episode_id as string)
        .single()
      if (!episode) return { result: null, error: 'Episode not found' }

      const { data: transcription } = await supabase
        .from('transcriptions')
        .select('result')
        .eq('episode_id', actionData.episode_id as string)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (!transcription?.result) return { result: null, error: 'No transcript available for this episode' }

      const apiKey = getAnthropicApiKey(addon)
      const show = episode.shows as unknown as { name: string; description: string; ai_tone: string | null; ai_length: string | null }

      const genResult = await generate(genType, {
        transcript: transcription.result as string,
        showName: show.name,
        showDescription: show.description || '',
        episodeTitle: episode.title,
        tone: (show.ai_tone as AiTone) || 'professional',
        length: (show.ai_length as AiLength) || 'standard',
      }, apiKey)

      await consumeCredits(ctx.orgId, cost, `chat_generate_${genType}`, episode.id)

      await supabase.from('ai_generations').insert({
        episode_id: episode.id,
        org_id: ctx.orgId,
        user_id: ctx.userId,
        type: genType,
        result: genResult.result,
        input_tokens: genResult.inputTokens,
        output_tokens: genResult.outputTokens,
        credits_used: cost,
      })

      return { result: { type: genType, content: genResult.result } }
    }

    case 'transcribe_episode': {
      const { getAiAddonStatus, getDeepgramApiKey, consumeCredits: consumeAiCredits, totalAvailableCredits } = await import('@/lib/ai/entitlements')
      const { submitTranscription, buildCallbackUrl } = await import('@/lib/ai/deepgram')

      const addon = await getAiAddonStatus(ctx.orgId)

      const { data: fileRef } = await supabase
        .from('file_references')
        .select('id, file_url, mime_type')
        .eq('episode_id', actionData.episode_id as string)
        .or('mime_type.ilike.audio/%,mime_type.ilike.video/%')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!fileRef?.file_url) return { result: null, error: 'No audio file found for this episode' }

      const estimatedMinutes = 60
      if (!addon.selfHosted && totalAvailableCredits(addon) < estimatedMinutes) {
        return { result: null, error: 'Insufficient credits for transcription' }
      }

      const { data: episode } = await supabase
        .from('episodes')
        .select('show_id')
        .eq('id', actionData.episode_id as string)
        .single()

      const { data: transcription } = await supabase
        .from('transcriptions')
        .insert({
          org_id: ctx.orgId,
          episode_id: actionData.episode_id,
          source_type: 'file_reference',
          source_ref: fileRef.id,
          credits_consumed: estimatedMinutes,
        })
        .select()
        .single()

      if (!transcription) return { result: null, error: 'Failed to create transcription record' }

      const { success } = await consumeAiCredits(ctx.orgId, estimatedMinutes, 'transcription', transcription.id)
      if (!success) {
        await supabase.from('transcriptions').delete().eq('id', transcription.id)
        return { result: null, error: 'Insufficient credits' }
      }

      try {
        const callbackUrl = buildCallbackUrl(transcription.id)
        const apiKey = getDeepgramApiKey(addon)
        const { requestId } = await submitTranscription(fileRef.file_url, callbackUrl, apiKey)
        await supabase.from('transcriptions').update({ external_request_id: requestId }).eq('id', transcription.id)
      } catch (err) {
        await supabase.from('transcriptions').update({ status: 'failed', error_message: (err as Error).message }).eq('id', transcription.id)
        const { refundCredits: refundAiCredits } = await import('@/lib/ai/entitlements')
        await refundAiCredits(ctx.orgId, estimatedMinutes, 'transcription_failed', transcription.id)
        return { result: null, error: `Transcription failed: ${(err as Error).message}` }
      }

      if (episode?.show_id) {
        await supabase.from('activity_log').insert({
          show_id: episode.show_id,
          episode_id: actionData.episode_id,
          action: 'transcription_started',
          description: 'Transcription started via AI chat',
        })
      }

      return { result: { transcription_id: transcription.id, status: 'pending' } }
    }

    default:
      return { result: null, error: `Unknown action: ${actionType}` }
  }
}

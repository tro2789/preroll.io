import { getAuthenticatedClient, errorResponse } from '@/lib/api/helpers'
import { createServiceClient } from '@/lib/supabase/server'
import { getAiAddonStatus, totalAvailableCredits, consumeCredits, getAnthropicApiKey } from '@/lib/ai/entitlements'
import { streamChat, buildSystemPrompt } from '@/lib/ai/chat-stream'
import { executeAction, WRITE_TOOL_NAMES } from '@/lib/ai/chat-tools'
import { AI_CHAT_CREDIT_COST, AI_CHAT_CONTEXT_WINDOW } from '@/lib/ai/constants'
import type Anthropic from '@anthropic-ai/sdk'

export async function POST(request: Request) {
  const { user, org, error } = await getAuthenticatedClient()
  if (error) return error

  const addon = await getAiAddonStatus(org!.id)
  if (!addon.enabled) {
    return errorResponse('AI features require a Pro or Studio plan', 403)
  }

  const available = totalAvailableCredits(addon)
  if (!addon.selfHosted && available < AI_CHAT_CREDIT_COST) {
    return errorResponse('Insufficient AI credits', 403)
  }

  const body = await request.json()
  const { session_id, message, context } = body as {
    session_id?: string
    message: string
    context?: { type?: string; id?: string; path?: string; label?: string }
  }

  if (!message?.trim()) {
    return errorResponse('message is required')
  }

  const supabase = createServiceClient()

  let sessionId = session_id
  if (!sessionId) {
    const { data: session } = await supabase
      .from('ai_chat_sessions')
      .insert({
        org_id: org!.id,
        user_id: user!.id,
        context_type: context?.type || 'general',
        context_id: context?.id || null,
      })
      .select('id')
      .single()
    sessionId = session?.id
  }

  if (!sessionId) {
    return errorResponse('Failed to create chat session', 500)
  }

  await supabase.from('ai_chat_messages').insert({
    session_id: sessionId,
    role: 'user',
    content: message,
  })

  const { data: historyRows } = await supabase
    .from('ai_chat_messages')
    .select('role, content, tool_calls, tool_results')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })
    .limit(AI_CHAT_CONTEXT_WINDOW)

  const messages: Anthropic.Messages.MessageParam[] = []
  for (const row of historyRows || []) {
    if (row.role === 'user') {
      messages.push({ role: 'user', content: row.content })
    } else if (row.role === 'assistant') {
      const content: Anthropic.Messages.ContentBlockParam[] = []
      if (row.content) {
        content.push({ type: 'text', text: row.content })
      }
      if (row.tool_calls) {
        for (const tc of row.tool_calls as Array<{ id: string; name: string; input: Record<string, unknown> }>) {
          content.push({ type: 'tool_use', id: tc.id, name: tc.name, input: tc.input })
        }
      }
      if (content.length > 0) {
        messages.push({ role: 'assistant', content })
      }
      if (row.tool_results) {
        const toolResults = row.tool_results as Array<{ tool_use_id: string; content: string }>
        messages.push({
          role: 'user',
          content: toolResults.map((tr) => ({
            type: 'tool_result' as const,
            tool_use_id: tr.tool_use_id,
            content: tr.content,
          })),
        })
      }
    }
  }

  const { data: orgData } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', org!.id)
    .single()

  const systemPrompt = buildSystemPrompt({
    orgName: orgData?.name || 'Your Organization',
    userName: user!.email || 'User',
    role: org!.role,
    planName: org!.planId,
    monthlyRemaining: addon.monthlyRemaining,
    monthlyAllowance: addon.monthlyAllowance,
    purchasedCredits: addon.creditsBalance,
    currentPath: context?.path,
    contextType: context?.type,
    contextLabel: context?.label,
  })

  const apiKey = getAnthropicApiKey(addon)

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      function send(event: string, data: unknown) {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
      }

      send('session', { session_id: sessionId })

      let fullText = ''
      const toolCalls: Array<{ id: string; name: string; input: Record<string, unknown> }> = []
      const toolResults: Array<{ tool_use_id: string; content: string }> = []
      let totalTokens = 0

      try {
        for await (const event of streamChat({
          messages,
          systemPrompt,
          toolContext: { orgId: org!.id, userId: user!.id },
          apiKey,
        })) {
          switch (event.type) {
            case 'delta':
              send('delta', { content: event.content })
              fullText += event.content
              break
            case 'tool_call':
              send('tool_call', { id: event.id, name: event.name })
              break
            case 'tool_result':
              send('tool_result', { id: event.tool_use_id, name: event.name, result: event.result })
              break
            case 'action_request':
              send('action_request', {
                action_type: event.action_type,
                description: event.description,
                action_data: event.action_data,
                tool_use_id: event.tool_use_id,
              })
              break
            case 'done':
              totalTokens = (event.tokens_used as number) || 0
              break
            case 'error':
              send('error', { message: event.message })
              break
          }
        }

        await supabase.from('ai_chat_messages').insert({
          session_id: sessionId,
          role: 'assistant',
          content: fullText,
          tool_calls: toolCalls.length > 0 ? toolCalls : null,
          tool_results: toolResults.length > 0 ? toolResults : null,
          tokens_used: totalTokens,
        })

        await consumeCredits(org!.id, AI_CHAT_CREDIT_COST, 'ai_chat', sessionId!)

        if (!session_id) {
          const title = message.length > 60 ? message.slice(0, 57) + '...' : message
          await supabase.from('ai_chat_sessions').update({ title }).eq('id', sessionId)
        }

        send('done', { tokens_used: totalTokens })
      } catch (err) {
        send('error', { message: (err as Error).message })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}

export async function PUT(request: Request) {
  const { user, org, error } = await getAuthenticatedClient()
  if (error) return error

  const body = await request.json()
  const { session_id, action_type, action_data, tool_use_id, confirmed } = body as {
    session_id: string
    action_type: string
    action_data: Record<string, unknown>
    tool_use_id: string
    confirmed: boolean
  }

  if (!session_id || !action_type || !tool_use_id) {
    return errorResponse('session_id, action_type, and tool_use_id are required')
  }

  const supabase = createServiceClient()

  const { data: session } = await supabase
    .from('ai_chat_sessions')
    .select('id')
    .eq('id', session_id)
    .eq('org_id', org!.id)
    .single()

  if (!session) {
    return errorResponse('Session not found', 404)
  }

  if (!confirmed) {
    await supabase.from('ai_chat_actions').insert({
      session_id,
      org_id: org!.id,
      action_type,
      action_data,
      status: 'cancelled',
    })
    return new Response(JSON.stringify({ data: { status: 'cancelled' } }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const result = await executeAction(action_type, action_data, {
    orgId: org!.id,
    userId: user!.id,
  })

  const status = result.error ? 'failed' : 'executed'

  await supabase.from('ai_chat_actions').insert({
    session_id,
    org_id: org!.id,
    action_type,
    entity_type: action_data.episode_id ? 'episode' : action_data.client_id ? 'client' : action_data.show_id ? 'show' : null,
    entity_id: (action_data.episode_id || action_data.client_id || action_data.show_id || null) as string | null,
    action_data,
    status,
  })

  if (result.error) {
    return errorResponse(result.error, 500)
  }

  return new Response(JSON.stringify({ data: { status: 'executed', result: result.result } }), {
    headers: { 'Content-Type': 'application/json' },
  })
}

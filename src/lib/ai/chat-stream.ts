import Anthropic from '@anthropic-ai/sdk'
import { AI_CHAT_MODEL, AI_CHAT_MAX_TOKENS } from '@/lib/ai/constants'
import { getAllTools, executeTool, WRITE_TOOL_NAMES, type ToolContext, type ToolResult } from '@/lib/ai/chat-tools'

export interface ChatEvent {
  type: 'session' | 'delta' | 'tool_call' | 'tool_result' | 'action_request' | 'done' | 'error'
  [key: string]: unknown
}

interface StreamParams {
  messages: Anthropic.Messages.MessageParam[]
  systemPrompt: string
  toolContext: ToolContext
  apiKey: string
}

const MAX_TOOL_ROUNDS = 5

export async function* streamChat(params: StreamParams): AsyncGenerator<ChatEvent> {
  const client = new Anthropic({ apiKey: params.apiKey })
  const tools = getAllTools()
  let messages = [...params.messages]
  let toolRound = 0

  while (toolRound < MAX_TOOL_ROUNDS) {
    const stream = client.messages.stream({
      model: AI_CHAT_MODEL,
      max_tokens: AI_CHAT_MAX_TOKENS,
      system: params.systemPrompt,
      messages,
      tools,
    })

    let assistantContent: Anthropic.Messages.ContentBlock[] = []
    const pendingToolUses: Array<{ id: string; name: string; input: Record<string, unknown> }> = []

    for await (const event of stream) {
      if (event.type === 'content_block_start') {
        if (event.content_block.type === 'text') {
          // Text block starting — nothing to emit yet
        } else if (event.content_block.type === 'tool_use') {
          yield { type: 'tool_call', id: event.content_block.id, name: event.content_block.name }
        }
      }

      if (event.type === 'content_block_delta') {
        if (event.delta.type === 'text_delta') {
          yield { type: 'delta', content: event.delta.text }
        }
      }
    }

    const finalMessage = await stream.finalMessage()
    assistantContent = finalMessage.content

    for (const block of assistantContent) {
      if (block.type === 'tool_use') {
        pendingToolUses.push({ id: block.id, name: block.name, input: block.input as Record<string, unknown> })
      }
    }

    if (pendingToolUses.length === 0) {
      yield {
        type: 'done',
        tokens_used: finalMessage.usage.input_tokens + finalMessage.usage.output_tokens,
        input_tokens: finalMessage.usage.input_tokens,
        output_tokens: finalMessage.usage.output_tokens,
      }
      return
    }

    messages = [
      ...messages,
      { role: 'assistant' as const, content: assistantContent },
    ]

    const toolResults: Anthropic.Messages.ToolResultBlockParam[] = []

    for (const toolUse of pendingToolUses) {
      let toolResult: ToolResult

      try {
        toolResult = await executeTool(toolUse.name, toolUse.input, params.toolContext)
      } catch (err) {
        toolResult = { result: { error: (err as Error).message } }
      }

      if (toolResult.requiresConfirmation) {
        yield {
          type: 'action_request',
          tool_use_id: toolUse.id,
          action_type: toolResult.actionType,
          description: toolResult.actionDescription,
          action_data: toolResult.actionData,
        }

        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: JSON.stringify({
            status: 'awaiting_confirmation',
            preview: (toolResult.result as { preview?: string })?.preview,
            message: 'The user will confirm or cancel this action via the chat UI. Present the action to the user and wait for their decision.',
          }),
        })
      } else {
        yield {
          type: 'tool_result',
          tool_use_id: toolUse.id,
          name: toolUse.name,
          result: toolResult.result,
        }

        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: JSON.stringify(toolResult.result),
        })
      }
    }

    messages = [
      ...messages,
      { role: 'user' as const, content: toolResults },
    ]

    toolRound++
  }

  yield { type: 'error', message: 'Maximum tool use rounds exceeded' }
}

export function buildSystemPrompt(params: {
  orgName: string
  userName: string
  role: string
  planName: string
  monthlyRemaining: number
  monthlyAllowance: number
  purchasedCredits: number
  currentPath?: string
  contextType?: string
  contextLabel?: string
}): string {
  let prompt = `You are the PreRoll AI assistant. You help podcast producers manage their shows, episodes, and client workflows.

You have access to tools that let you read and modify data in the user's PreRoll workspace. For any action that modifies data (creating, updating, moving), always describe what you're about to do and wait for confirmation before executing.

Be concise and direct. You're talking to busy producers who want quick answers and actions. Use bullet points for lists. Reference specific show/episode names when available.

Current context:
- Organization: ${params.orgName}
- User: ${params.userName} (${params.role})
- Plan: ${params.planName} (AI credits: ${params.monthlyRemaining}/${params.monthlyAllowance} monthly, ${params.purchasedCredits} purchased)
- Current page: ${params.currentPath || '/app'}`

  if (params.contextType && params.contextLabel) {
    prompt += `\n- Viewing: ${params.contextLabel}`
  }

  prompt += `

Guidelines:
- When the user asks about "this episode" or "this show", use the context above
- For write operations, always preview the change and ask for confirmation
- If credits are low, mention it when suggesting AI operations
- Don't offer to do things you can't (delete, billing, integrations setup)
- If you're not sure what the user wants, ask a clarifying question rather than guessing`

  return prompt
}

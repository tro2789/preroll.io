import Anthropic from '@anthropic-ai/sdk'
import {
  type GenerationContext,
  showNotesPrompt,
  descriptionPrompt,
  socialPrompt,
  titleSuggestionsPrompt,
} from './prompts'
import type { GenerationType } from './constants'

const MAX_TRANSCRIPT_CHARS = 200_000

function truncateTranscript(transcript: string): string {
  if (transcript.length <= MAX_TRANSCRIPT_CHARS) return transcript
  return transcript.slice(0, MAX_TRANSCRIPT_CHARS) + '\n\n[Transcript truncated]'
}

function getPrompt(type: GenerationType, ctx: GenerationContext): { system: string; user: string } {
  const truncatedCtx = { ...ctx, transcript: truncateTranscript(ctx.transcript) }

  switch (type) {
    case 'show_notes':
      return showNotesPrompt(truncatedCtx)
    case 'description':
      return descriptionPrompt(truncatedCtx)
    case 'social_twitter':
      return socialPrompt(truncatedCtx, 'twitter')
    case 'social_linkedin':
      return socialPrompt(truncatedCtx, 'linkedin')
    case 'social_instagram':
      return socialPrompt(truncatedCtx, 'instagram')
    case 'title_suggestions':
      return titleSuggestionsPrompt(truncatedCtx)
  }
}

const MODELS: Partial<Record<GenerationType, string>> & { default: string } = {
  default: 'claude-haiku-4-5-20251001',
  show_notes: 'claude-sonnet-4-6',
}

function getModel(type: GenerationType): string {
  return MODELS[type] || MODELS.default
}

export async function generate(
  type: GenerationType,
  ctx: GenerationContext,
  apiKey: string
): Promise<{ result: string; inputTokens: number; outputTokens: number }> {
  const client = new Anthropic({ apiKey })
  const { system, user } = getPrompt(type, ctx)

  const response = await client.messages.create({
    model: getModel(type),
    max_tokens: 2048,
    system,
    messages: [{ role: 'user', content: user }],
  })

  const textBlock = response.content.find((b: { type: string }) => b.type === 'text') as { type: 'text'; text: string } | undefined
  const result = textBlock?.text || ''

  return {
    result,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  }
}

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
// Short-form generation types only need a representative slice of the transcript,
// not the whole thing. Cap their input to keep cost/latency down.
const SHORT_FORM_TRANSCRIPT_CHARS = 40_000
const SHORT_FORM_TYPES: ReadonlySet<GenerationType> = new Set([
  'social_twitter',
  'social_linkedin',
  'social_instagram',
  'description',
  'title_suggestions',
])

function truncateTranscript(transcript: string, maxChars: number): string {
  if (transcript.length <= maxChars) return transcript
  return transcript.slice(0, maxChars) + '\n\n[Transcript truncated]'
}

function getPrompt(type: GenerationType, ctx: GenerationContext): { system: string; user: string } {
  const maxChars = SHORT_FORM_TYPES.has(type) ? SHORT_FORM_TRANSCRIPT_CHARS : MAX_TRANSCRIPT_CHARS
  const truncatedCtx = { ...ctx, transcript: truncateTranscript(ctx.transcript, maxChars) }

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

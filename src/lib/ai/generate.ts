import Anthropic from '@anthropic-ai/sdk'
import {
  type GenerationContext,
  showNotesPrompt,
  descriptionPrompt,
  socialPrompt,
  titleSuggestionsPrompt,
} from './prompts'

const MAX_TRANSCRIPT_CHARS = 200_000

type GenerationType = 'show_notes' | 'description' | 'social_twitter' | 'social_linkedin' | 'social_instagram' | 'title_suggestions'

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

const MODEL = 'claude-haiku-4-5-20251001'

export async function generate(
  type: GenerationType,
  ctx: GenerationContext,
  apiKey: string
): Promise<{ result: string; inputTokens: number; outputTokens: number }> {
  const client = new Anthropic({ apiKey })
  const { system, user } = getPrompt(type, ctx)

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system,
    messages: [{ role: 'user', content: user }],
  })

  const textBlock = response.content.find(b => b.type === 'text')
  const result = textBlock?.text || ''

  return {
    result,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  }
}

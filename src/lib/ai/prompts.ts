import type { AiTone, AiLength } from './constants'

export interface GenerationContext {
  transcript: string
  showName: string
  showDescription?: string
  episodeTitle: string
  episodeNumber?: number
  format?: string
  existingNotes?: string
  previousTitles?: string[]
  showNotesTemplate?: string
  tone?: AiTone
  length?: AiLength
}

const TONE_GUIDE: Record<string, string> = {
  professional: 'Use a professional, polished tone.',
  casual: 'Use a casual, conversational tone.',
  energetic: 'Use an energetic, enthusiastic tone.',
}

const LENGTH_GUIDE: Record<string, string> = {
  brief: 'Keep it concise — shorter is better.',
  detailed: 'Be thorough and detailed.',
}

function showContext(ctx: GenerationContext): string {
  const parts = [`Show: ${ctx.showName}`]
  if (ctx.showDescription) parts.push(`Show description: ${ctx.showDescription}`)
  if (ctx.format) parts.push(`Format: ${ctx.format}`)
  parts.push(`Episode: ${ctx.episodeTitle}`)
  if (ctx.episodeNumber) parts.push(`Episode number: ${ctx.episodeNumber}`)
  if (ctx.previousTitles?.length) {
    parts.push(`Previous episodes: ${ctx.previousTitles.slice(0, 5).join(', ')}`)
  }
  if (ctx.showNotesTemplate) {
    parts.push(`Show notes template/style guide:\n${ctx.showNotesTemplate}`)
  }
  return parts.join('\n')
}

function styleDirective(ctx: GenerationContext): string {
  const parts: string[] = []
  if (ctx.tone && TONE_GUIDE[ctx.tone]) parts.push(TONE_GUIDE[ctx.tone])
  if (ctx.length && LENGTH_GUIDE[ctx.length]) parts.push(LENGTH_GUIDE[ctx.length])
  return parts.length > 0 ? '\n' + parts.join(' ') : ''
}

export function showNotesPrompt(ctx: GenerationContext): { system: string; user: string } {
  return {
    system: `You are a podcast show notes writer. Write structured, scannable show notes from a transcript. Include:
- A brief summary (2-3 sentences)
- Key topics discussed with timestamps (MM:SS format)
- Notable quotes (if any)
- Guest names and titles (if mentioned)
- Resources or links mentioned

Use markdown formatting. Be concise — producers need notes they can publish directly, not an essay.${styleDirective(ctx)}`,
    user: `${showContext(ctx)}

Transcript:
${ctx.transcript}

Write show notes for this episode.`,
  }
}

export function descriptionPrompt(ctx: GenerationContext): { system: string; user: string } {
  return {
    system: `You are a podcast copywriter. Write a compelling 2-3 sentence episode description suitable for podcast directories (Apple Podcasts, Spotify). It should hook potential listeners and summarize the episode's value. No hashtags, no "In this episode..." openings.${styleDirective(ctx)}`,
    user: `${showContext(ctx)}

Transcript:
${ctx.transcript}

Write an episode description.`,
  }
}

export function socialPrompt(
  ctx: GenerationContext,
  platform: 'twitter' | 'linkedin' | 'instagram'
): { system: string; user: string } {
  const platformGuide = {
    twitter: 'Write a tweet (max 280 chars) promoting this episode. Punchy, conversational. Include 1-2 relevant hashtags.',
    linkedin: 'Write a LinkedIn post (2-3 short paragraphs) promoting this episode. Professional but not stuffy. End with a call to listen.',
    instagram: 'Write an Instagram caption promoting this episode. Engaging, relatable tone. Include 5-8 relevant hashtags at the end.',
  }

  return {
    system: `You are a social media copywriter for podcasts. ${platformGuide[platform]}${styleDirective(ctx)}`,
    user: `${showContext(ctx)}

Transcript:
${ctx.transcript}

Write the social media post.`,
  }
}

export function titleSuggestionsPrompt(ctx: GenerationContext): { system: string; user: string } {
  return {
    system: `You are a podcast title strategist. Generate 5 episode title options. Mix styles:
- One straightforward/descriptive
- One curiosity-driven / question
- One with a strong hook or bold claim
- Two variations mixing the above

Titles should be concise (under 60 chars each), SEO-friendly, and compelling. Return only the titles, one per line, numbered.${styleDirective(ctx)}`,
    user: `${showContext(ctx)}

Transcript:
${ctx.transcript}

Suggest 5 episode titles.`,
  }
}

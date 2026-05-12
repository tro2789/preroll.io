const DEEPGRAM_API_BASE = 'https://api.deepgram.com/v1'

interface TranscriptionResult {
  requestId: string
}

export async function submitTranscription(
  audioUrl: string,
  callbackUrl: string,
  apiKey: string
): Promise<TranscriptionResult> {
  const params = new URLSearchParams({
    model: 'nova-2',
    smart_format: 'true',
    diarize: 'true',
    punctuate: 'true',
    paragraphs: 'true',
    utterances: 'true',
    callback: callbackUrl,
  })

  const res = await fetch(`${DEEPGRAM_API_BASE}/listen?${params}`, {
    method: 'POST',
    headers: {
      Authorization: `Token ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url: audioUrl }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Deepgram API error ${res.status}: ${body}`)
  }

  const data = await res.json()
  return { requestId: data.request_id }
}

export function getSiteBaseUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
    || 'http://localhost:3003'
}

export function buildCallbackUrl(transcriptionId: string): string {
  return `${getSiteBaseUrl()}/api/v1/webhooks/deepgram?id=${transcriptionId}`
}

export interface DeepgramSegment {
  start: number
  end: number
  text: string
  speaker: number
}

export interface ParsedTranscript {
  fullText: string
  segments: DeepgramSegment[]
  speakerCount: number
  wordCount: number
  durationSeconds: number
}

export function parseDeepgramResponse(body: Record<string, unknown>): ParsedTranscript {
  const results = body.results as Record<string, unknown> | undefined
  if (!results) throw new Error('No results in Deepgram response')

  const channels = results.channels as Array<Record<string, unknown>> | undefined
  const channel = channels?.[0]
  if (!channel) throw new Error('No channels in Deepgram response')

  const alternatives = channel.alternatives as Array<Record<string, unknown>> | undefined
  const alt = alternatives?.[0]
  if (!alt) throw new Error('No alternatives in Deepgram response')

  const fullText = (alt.transcript as string) || ''
  const words = alt.words as Array<Record<string, unknown>> | undefined

  const speakers = new Set<number>()
  let wordCount = 0

  if (words) {
    for (const w of words) {
      wordCount++
      if (typeof w.speaker === 'number') speakers.add(w.speaker)
    }
  }

  const utterances = results.utterances as Array<Record<string, unknown>> | undefined
  const segments: DeepgramSegment[] = []

  if (utterances) {
    for (const u of utterances) {
      segments.push({
        start: u.start as number,
        end: u.end as number,
        text: u.transcript as string,
        speaker: u.speaker as number,
      })
    }
  }

  const metadata = body.metadata as Record<string, unknown> | undefined
  const durationSeconds = (metadata?.duration as number) || 0

  return {
    fullText,
    segments,
    speakerCount: speakers.size,
    wordCount,
    durationSeconds,
  }
}

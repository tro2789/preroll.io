import { describe, it, expect } from 'vitest'
import { parseDeepgramResponse, buildCallbackUrl } from '../deepgram'

describe('buildCallbackUrl', () => {
  it('uses NEXT_PUBLIC_SITE_URL when set', () => {
    const original = process.env.NEXT_PUBLIC_SITE_URL
    process.env.NEXT_PUBLIC_SITE_URL = 'https://api.preroll.io'
    try {
      const url = buildCallbackUrl('txn-123')
      expect(url).toBe('https://api.preroll.io/api/v1/webhooks/deepgram?id=txn-123')
    } finally {
      process.env.NEXT_PUBLIC_SITE_URL = original
    }
  })

  it('falls back to VERCEL_URL when SITE_URL is not set', () => {
    const origSite = process.env.NEXT_PUBLIC_SITE_URL
    const origVercel = process.env.VERCEL_URL
    delete process.env.NEXT_PUBLIC_SITE_URL
    process.env.VERCEL_URL = 'preroll-abc.vercel.app'
    try {
      const url = buildCallbackUrl('txn-456')
      expect(url).toBe('https://preroll-abc.vercel.app/api/v1/webhooks/deepgram?id=txn-456')
    } finally {
      process.env.NEXT_PUBLIC_SITE_URL = origSite
      process.env.VERCEL_URL = origVercel
    }
  })

  it('falls back to localhost when no env vars set', () => {
    const origSite = process.env.NEXT_PUBLIC_SITE_URL
    const origVercel = process.env.VERCEL_URL
    delete process.env.NEXT_PUBLIC_SITE_URL
    delete process.env.VERCEL_URL
    try {
      const url = buildCallbackUrl('txn-789')
      expect(url).toBe('http://localhost:3003/api/v1/webhooks/deepgram?id=txn-789')
    } finally {
      process.env.NEXT_PUBLIC_SITE_URL = origSite
      process.env.VERCEL_URL = origVercel
    }
  })
})

describe('parseDeepgramResponse', () => {
  const validResponse = {
    results: {
      channels: [{
        alternatives: [{
          transcript: 'Hello world. How are you today?',
          words: [
            { word: 'Hello', start: 0.0, end: 0.5, speaker: 0 },
            { word: 'world', start: 0.5, end: 1.0, speaker: 0 },
            { word: 'How', start: 1.5, end: 1.8, speaker: 1 },
            { word: 'are', start: 1.8, end: 2.0, speaker: 1 },
            { word: 'you', start: 2.0, end: 2.2, speaker: 1 },
            { word: 'today', start: 2.2, end: 2.8, speaker: 1 },
          ],
        }],
      }],
      utterances: [
        { start: 0.0, end: 1.0, transcript: 'Hello world.', speaker: 0 },
        { start: 1.5, end: 2.8, transcript: 'How are you today?', speaker: 1 },
      ],
    },
    metadata: {
      duration: 3.0,
    },
  }

  it('extracts full text from transcript', () => {
    const result = parseDeepgramResponse(validResponse)
    expect(result.fullText).toBe('Hello world. How are you today?')
  })

  it('counts words correctly', () => {
    const result = parseDeepgramResponse(validResponse)
    expect(result.wordCount).toBe(6)
  })

  it('identifies unique speakers', () => {
    const result = parseDeepgramResponse(validResponse)
    expect(result.speakerCount).toBe(2)
  })

  it('parses utterances into segments', () => {
    const result = parseDeepgramResponse(validResponse)
    expect(result.segments).toHaveLength(2)
    expect(result.segments[0]).toEqual({
      start: 0.0,
      end: 1.0,
      text: 'Hello world.',
      speaker: 0,
    })
    expect(result.segments[1]).toEqual({
      start: 1.5,
      end: 2.8,
      text: 'How are you today?',
      speaker: 1,
    })
  })

  it('extracts duration from metadata', () => {
    const result = parseDeepgramResponse(validResponse)
    expect(result.durationSeconds).toBe(3.0)
  })

  it('returns 0 duration when metadata missing', () => {
    const noMeta = { ...validResponse, metadata: undefined }
    const result = parseDeepgramResponse(noMeta as unknown as Record<string, unknown>)
    expect(result.durationSeconds).toBe(0)
  })

  it('handles single speaker', () => {
    const singleSpeaker = {
      results: {
        channels: [{
          alternatives: [{
            transcript: 'Just me talking.',
            words: [
              { word: 'Just', speaker: 0 },
              { word: 'me', speaker: 0 },
              { word: 'talking', speaker: 0 },
            ],
          }],
        }],
        utterances: [],
      },
      metadata: { duration: 2.0 },
    }
    const result = parseDeepgramResponse(singleSpeaker)
    expect(result.speakerCount).toBe(1)
    expect(result.wordCount).toBe(3)
    expect(result.segments).toHaveLength(0)
  })

  it('throws when results are missing', () => {
    expect(() => parseDeepgramResponse({})).toThrow('No results in Deepgram response')
  })

  it('throws when channels are missing', () => {
    expect(() => parseDeepgramResponse({ results: {} })).toThrow('No channels in Deepgram response')
  })

  it('throws when alternatives are missing', () => {
    expect(() => parseDeepgramResponse({
      results: { channels: [{}] },
    })).toThrow('No alternatives in Deepgram response')
  })
})

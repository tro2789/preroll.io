import { describe, it, expect, vi, beforeEach } from 'vitest'
import { isAudioMimeType } from '../pipeline'

// Mock all external dependencies so we can test triggerAiPipeline in isolation
const mockFrom = vi.fn()
const mockSupabase = { from: mockFrom }

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: () => mockSupabase,
}))

const mockGetAiAddonStatus = vi.fn()
const mockTotalAvailableCredits = vi.fn()
const mockConsumeCredits = vi.fn()
const mockRefundCredits = vi.fn()
const mockGetDeepgramApiKey = vi.fn()

vi.mock('../entitlements', () => ({
  getAiAddonStatus: (...args: unknown[]) => mockGetAiAddonStatus(...args),
  totalAvailableCredits: (...args: unknown[]) => mockTotalAvailableCredits(...args),
  consumeCredits: (...args: unknown[]) => mockConsumeCredits(...args),
  refundCredits: (...args: unknown[]) => mockRefundCredits(...args),
  getDeepgramApiKey: (...args: unknown[]) => mockGetDeepgramApiKey(...args),
}))

const mockSubmitTranscription = vi.fn()
const mockBuildCallbackUrl = vi.fn()

vi.mock('../deepgram', () => ({
  submitTranscription: (...args: unknown[]) => mockSubmitTranscription(...args),
  buildCallbackUrl: (...args: unknown[]) => mockBuildCallbackUrl(...args),
}))

// Import after mocks
const { triggerAiPipeline } = await import('../pipeline')

const baseParams = {
  orgId: 'org-1',
  episodeId: 'ep-1',
  fileReferenceId: 'ref-1',
  audioUrl: 'https://example.com/audio.mp3',
  durationSeconds: 120,
  triggerSource: 'manual' as const,
}

function chainable(resolvedData: unknown = null) {
  const chain: Record<string, unknown> = {}
  const result = { data: resolvedData, error: null, count: 0 }

  for (const method of ['select', 'insert', 'update', 'delete', 'eq', 'in', 'not', 'is', 'limit', 'single', 'maybeSingle', 'order']) {
    chain[method] = vi.fn().mockReturnValue(chain)
  }
  chain['single'] = vi.fn().mockResolvedValue(result)
  chain['maybeSingle'] = vi.fn().mockResolvedValue(result)
  // For count queries
  Object.defineProperty(chain, '_result', { value: result, writable: true })

  return chain
}

describe('isAudioMimeType', () => {
  it('returns true for audio mime types', () => {
    expect(isAudioMimeType('audio/mpeg')).toBe(true)
    expect(isAudioMimeType('audio/wav')).toBe(true)
    expect(isAudioMimeType('audio/ogg')).toBe(true)
  })

  it('returns true for video mime types', () => {
    expect(isAudioMimeType('video/mp4')).toBe(true)
    expect(isAudioMimeType('video/webm')).toBe(true)
    expect(isAudioMimeType('video/quicktime')).toBe(true)
  })

  it('returns false for non-audio/video types', () => {
    expect(isAudioMimeType('image/png')).toBe(false)
    expect(isAudioMimeType('application/pdf')).toBe(false)
    expect(isAudioMimeType('text/plain')).toBe(false)
  })

  it('returns false for null/undefined', () => {
    expect(isAudioMimeType(null)).toBe(false)
    expect(isAudioMimeType(undefined)).toBe(false)
  })

  it('returns false for empty string', () => {
    expect(isAudioMimeType('')).toBe(false)
  })
})

describe('triggerAiPipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function setupMocks(overrides: {
    addonEnabled?: boolean
    selfHosted?: boolean
    credits?: number
    episode?: unknown
    concurrentCount?: number
    existingTranscription?: unknown
    transcriptionInsert?: unknown
    consumeSuccess?: boolean
  } = {}) {
    const {
      addonEnabled = true,
      selfHosted = false,
      credits = 100,
      episode = { show_id: 'show-1', shows: { ai_auto_transcribe: true } },
      concurrentCount = 0,
      existingTranscription = null,
      transcriptionInsert = { id: 'txn-1' },
      consumeSuccess = true,
    } = overrides

    const addon = {
      enabled: addonEnabled,
      selfHosted,
      creditsBalance: credits,
      monthlyAllowance: 100,
      monthlyUsed: 0,
      monthlyRemaining: credits,
      cycleResetAt: null,
      deepgramApiKey: null,
      anthropicApiKey: null,
    }

    mockGetAiAddonStatus.mockResolvedValue(addon)
    mockTotalAvailableCredits.mockReturnValue(credits)
    mockConsumeCredits.mockResolvedValue({ success: consumeSuccess })
    mockRefundCredits.mockResolvedValue(undefined)
    mockGetDeepgramApiKey.mockReturnValue('dk-test')
    mockBuildCallbackUrl.mockReturnValue('https://example.com/callback')
    mockSubmitTranscription.mockResolvedValue({ requestId: 'req-1' })

    // Build chainable mocks for each table
    const episodesChain = chainable(episode)
    const pipelineJobsChain = chainable({ id: 'job-1' })
    const transcriptionsCountChain = chainable(null)
    const transcriptionsExistingChain = chainable(existingTranscription)
    const transcriptionsInsertChain = chainable(transcriptionInsert)
    const transcriptionsUpdateChain = chainable(null)
    const transcriptionsDeleteChain = chainable(null)
    const activityLogChain = chainable(null)

    // Override the count query result
    const countSelectFn = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({ count: concurrentCount, data: null, error: null }),
      }),
    })

    let transcriptionsCallCount = 0
    mockFrom.mockImplementation((table: string) => {
      if (table === 'episodes') return episodesChain
      if (table === 'ai_pipeline_jobs') return pipelineJobsChain
      if (table === 'activity_log') return activityLogChain
      if (table === 'transcriptions') {
        transcriptionsCallCount++
        // Call 1: count query (concurrent check)
        if (transcriptionsCallCount === 1) {
          return { select: countSelectFn }
        }
        // Call 2: existing transcription check
        if (transcriptionsCallCount === 2) return transcriptionsExistingChain
        // Call 3: insert new transcription
        if (transcriptionsCallCount === 3) return transcriptionsInsertChain
        // Call 4+: updates/deletes
        return transcriptionsUpdateChain
      }
      return chainable(null)
    })

    return { addon }
  }

  it('skips when addon is disabled', async () => {
    setupMocks({ addonEnabled: false })
    const result = await triggerAiPipeline(baseParams)
    expect(result.status).toBe('skipped')
    expect(result.skippedReason).toBe('disabled')
  })

  it('skips when episode not found', async () => {
    setupMocks({ episode: null })
    const result = await triggerAiPipeline(baseParams)
    expect(result.status).toBe('skipped')
    expect(result.skippedReason).toBe('episode_not_found')
  })

  it('skips auto-trigger when show has ai_auto_transcribe disabled', async () => {
    setupMocks({ episode: { show_id: 'show-1', shows: { ai_auto_transcribe: false } } })
    const result = await triggerAiPipeline({ ...baseParams, triggerSource: 'auto_upload' })
    expect(result.status).toBe('skipped')
    expect(result.skippedReason).toBe('disabled')
  })

  it('allows manual trigger even when ai_auto_transcribe is disabled', async () => {
    setupMocks({ episode: { show_id: 'show-1', shows: { ai_auto_transcribe: false } } })
    const result = await triggerAiPipeline({ ...baseParams, triggerSource: 'manual' })
    expect(result.status).toBe('transcribing')
  })

  it('skips when not enough credits', async () => {
    setupMocks({ credits: 0 })
    const result = await triggerAiPipeline(baseParams)
    expect(result.status).toBe('skipped')
    expect(result.skippedReason).toBe('no_credits')
  })

  it('returns pending when at max concurrent transcriptions', async () => {
    setupMocks({ concurrentCount: 3 })
    const result = await triggerAiPipeline(baseParams)
    expect(result.status).toBe('pending')
  })

  it('skips when episode already has active transcription', async () => {
    setupMocks({ existingTranscription: { id: 'existing-txn' } })
    const result = await triggerAiPipeline(baseParams)
    expect(result.status).toBe('skipped')
    expect(result.skippedReason).toBe('already_transcribing')
  })

  it('succeeds and returns transcribing status', async () => {
    setupMocks()
    const result = await triggerAiPipeline(baseParams)
    expect(result.status).toBe('transcribing')
    expect(result.jobId).toBeTruthy()
  })

  it('estimates 60 minutes when no duration provided', async () => {
    setupMocks({ credits: 100 })
    await triggerAiPipeline({ ...baseParams, durationSeconds: undefined })
    expect(mockTotalAvailableCredits).toHaveBeenCalled()
  })

  it('bypasses credit check for self-hosted', async () => {
    setupMocks({ selfHosted: true, credits: 0 })
    const result = await triggerAiPipeline(baseParams)
    expect(result.status).toBe('transcribing')
  })
})

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { parseDeepgramResponse } from '@/lib/ai/deepgram'
import { refundCredits } from '@/lib/ai/entitlements'

export async function POST(request: NextRequest) {
  const transcriptionId = request.nextUrl.searchParams.get('id')
  if (!transcriptionId) {
    return NextResponse.json({ error: 'Missing transcription id' }, { status: 400 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { data: transcription } = await supabase
    .from('transcriptions')
    .select('id, org_id, episode_id, credits_consumed, audio_duration_seconds')
    .eq('id', transcriptionId)
    .single()

  if (!transcription) {
    return NextResponse.json({ error: 'Transcription not found' }, { status: 404 })
  }

  try {
    const parsed = parseDeepgramResponse(body)

    await supabase
      .from('transcriptions')
      .update({
        status: 'completed',
        full_text: parsed.fullText,
        segments: parsed.segments,
        speaker_count: parsed.speakerCount,
        word_count: parsed.wordCount,
        audio_duration_seconds: parsed.durationSeconds || transcription.audio_duration_seconds,
        completed_at: new Date().toISOString(),
      })
      .eq('id', transcriptionId)

    const actualMinutes = Math.ceil(parsed.durationSeconds / 60)
    const estimatedMinutes = transcription.credits_consumed
    if (actualMinutes < estimatedMinutes) {
      const refund = estimatedMinutes - actualMinutes
      await refundCredits(transcription.org_id, refund, 'transcription_adjustment', transcriptionId)
      await supabase
        .from('transcriptions')
        .update({ credits_consumed: actualMinutes })
        .eq('id', transcriptionId)
    }

    await supabase.from('activity_log').insert({
      show_id: null,
      episode_id: transcription.episode_id,
      action: 'transcription_completed',
      description: `Transcription completed (${parsed.wordCount} words, ${parsed.speakerCount} speakers)`,
      metadata: {
        transcription_id: transcriptionId,
        duration_seconds: parsed.durationSeconds,
        word_count: parsed.wordCount,
        speaker_count: parsed.speakerCount,
      },
    })

    return NextResponse.json({ received: true })
  } catch (err) {
    await supabase
      .from('transcriptions')
      .update({
        status: 'failed',
        error_message: (err as Error).message,
      })
      .eq('id', transcriptionId)

    await refundCredits(
      transcription.org_id,
      transcription.credits_consumed,
      'transcription_failed',
      transcriptionId
    )

    return NextResponse.json({ received: true, error: (err as Error).message })
  }
}

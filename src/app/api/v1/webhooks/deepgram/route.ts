import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { parseDeepgramResponse, verifyCallbackToken } from '@/lib/ai/deepgram'
import { refundCredits } from '@/lib/ai/entitlements'
import { runAutoGeneration } from '@/lib/ai/auto-generate'

export async function POST(request: NextRequest) {
  const transcriptionId = request.nextUrl.searchParams.get('id')
  if (!transcriptionId) {
    return NextResponse.json({ error: 'Missing transcription id' }, { status: 400 })
  }

  // SECURITY: the callback URL is signed; reject forged callbacks that only know the UUID.
  const token = request.nextUrl.searchParams.get('token')
  if (!verifyCallbackToken(transcriptionId, token)) {
    return NextResponse.json({ error: 'Invalid callback token' }, { status: 401 })
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
    .select('id, org_id, episode_id, credits_consumed, audio_duration_seconds, status')
    .eq('id', transcriptionId)
    .single()

  if (!transcription) {
    return NextResponse.json({ error: 'Transcription not found' }, { status: 404 })
  }

  if (transcription.status === 'completed' || transcription.status === 'failed') {
    return NextResponse.json({ received: true, skipped: 'already_processed' })
  }

  try {
    const parsed = parseDeepgramResponse(body)
    const actualMinutes = Math.ceil(parsed.durationSeconds / 60)
    const estimatedMinutes = transcription.credits_consumed

    await supabase
      .from('transcriptions')
      .update({
        status: 'completed',
        full_text: parsed.fullText,
        segments: parsed.segments,
        speaker_count: parsed.speakerCount,
        word_count: parsed.wordCount,
        audio_duration_seconds: parsed.durationSeconds || transcription.audio_duration_seconds,
        credits_consumed: actualMinutes,
        completed_at: new Date().toISOString(),
      })
      .eq('id', transcriptionId)

    if (actualMinutes < estimatedMinutes) {
      await refundCredits(transcription.org_id, estimatedMinutes - actualMinutes, 'transcription_adjustment', transcriptionId)
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

    const { data: pipelineJob } = await supabase
      .from('ai_pipeline_jobs')
      .select('id')
      .eq('transcription_id', transcriptionId)
      .in('status', ['transcribing', 'pending'])
      .limit(1)
      .single()

    if (pipelineJob) {
      try {
        await runAutoGeneration({
          orgId: transcription.org_id,
          episodeId: transcription.episode_id,
          transcriptionId,
          pipelineJobId: pipelineJob.id,
        })
      } catch (genErr) {
        console.error('Auto-generation failed:', genErr)
        await supabase
          .from('ai_pipeline_jobs')
          .update({ status: 'failed', error_message: (genErr as Error).message })
          .eq('id', pipelineJob.id)
      }
    }

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

    const { data: pipelineJob } = await supabase
      .from('ai_pipeline_jobs')
      .select('id')
      .eq('transcription_id', transcriptionId)
      .limit(1)
      .single()

    if (pipelineJob) {
      await supabase
        .from('ai_pipeline_jobs')
        .update({ status: 'failed', error_message: (err as Error).message })
        .eq('id', pipelineJob.id)
    }

    return NextResponse.json({ received: true, error: (err as Error).message })
  }
}

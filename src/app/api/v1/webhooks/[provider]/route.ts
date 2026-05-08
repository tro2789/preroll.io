import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getProvider, isValidProvider } from '@/lib/integrations/registry'
import { ensureProvidersRegistered } from '@/lib/integrations/init'
import { frameIoTimecodeToSecs } from '@/lib/format'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider: providerName } = await params

  ensureProvidersRegistered()
  if (!isValidProvider(providerName)) {
    return NextResponse.json({ error: 'Unknown provider' }, { status: 400 })
  }

  const rawBody = await request.text()
  const signature = request.headers.get('x-frameio-signature') || ''
  const timestamp = request.headers.get('x-frameio-request-timestamp') || ''

  const provider = getProvider(providerName)
  if (provider.verifyWebhookSignature && !provider.verifyWebhookSignature(rawBody, signature, timestamp)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const eventType = (payload.type as string) || 'unknown'
  const resourceId = (payload.resource as Record<string, unknown>)?.id as string | undefined
  const eventId = (payload.id as string) || undefined

  const supabase = createServiceClient()

  if (eventId) {
    const { data: existing } = await supabase
      .from('webhook_events')
      .select('id')
      .eq('provider', providerName)
      .eq('external_id', eventId)
      .eq('event_type', eventType)
      .not('processed_at', 'is', null)
      .limit(1)
      .single()

    if (existing) {
      return NextResponse.json({ received: true, duplicate: true })
    }
  }

  await supabase.from('webhook_events').insert({
    provider: providerName,
    event_type: eventType,
    external_id: eventId || resourceId || null,
    payload,
  })

  if (!resourceId) {
    return NextResponse.json({ received: true })
  }

  const { data: fileRef } = await supabase
    .from('file_references')
    .select('id, name, episode_id, episodes(show_id, title)')
    .eq('provider', providerName)
    .eq('external_id', resourceId)
    .limit(1)
    .single()

  if (!fileRef) {
    return NextResponse.json({ received: true })
  }

  const episode = fileRef.episodes as unknown as { show_id: string; title: string } | null

  if (eventType === 'comment.created' && episode) {
    const currentMeta = (await supabase.from('file_references').select('provider_metadata').eq('id', fileRef.id).single()).data
    const commentCount = ((currentMeta?.provider_metadata as Record<string, unknown>)?.comment_count as number || 0) + 1
    await supabase.from('file_references').update({
      provider_metadata: { ...currentMeta?.provider_metadata as Record<string, unknown>, comment_count: commentCount },
    }).eq('id', fileRef.id)

    await supabase.from('activity_log').insert({
      show_id: episode.show_id,
      episode_id: fileRef.episode_id,
      action: 'frameio_comment_created',
      description: `New comment on '${fileRef.name}' in Frame.io`,
      metadata: { provider: providerName, file_reference_id: fileRef.id },
    })

    // Sync comment into review_comments table
    const commentData = payload.resource as Record<string, unknown>
    const commentId = commentData?.id as string | undefined
    const commentText = commentData?.text as string | undefined

    if (commentId && commentText) {
      const { data: existingComment } = await supabase
        .from('review_comments')
        .select('id')
        .eq('external_id', commentId)
        .limit(1)
        .single()

      if (!existingComment) {
        const { data: deliverableRef } = await supabase
          .from('file_references')
          .select('deliverable_id')
          .eq('id', fileRef.id)
          .single()

        if (deliverableRef?.deliverable_id) {
          // Resolve author name from owner object
          const owner = commentData.owner as Record<string, unknown> | undefined
          const authorName = (owner?.name as string) || (owner?.email as string) || 'Editor'

          const timestampSecs = frameIoTimecodeToSecs(commentData.timestamp as string | number | null)

          await supabase.from('review_comments').insert({
            deliverable_id: deliverableRef.deliverable_id,
            file_reference_id: fileRef.id,
            author_name: authorName,
            text: commentText,
            timestamp_secs: timestampSecs,
            external_id: commentId,
            synced_at: new Date().toISOString(),
            is_external: true,
          })
        }
      }
    }
  }

  if (eventType === 'file.updated' && episode) {
    const fileData = payload.resource as Record<string, unknown>
    const newLabel = fileData?.label as string | undefined
    if (newLabel) {
      const currentMeta = (await supabase.from('file_references').select('provider_metadata').eq('id', fileRef.id).single()).data
      await supabase.from('file_references').update({
        provider_metadata: { ...currentMeta?.provider_metadata as Record<string, unknown>, label: newLabel },
      }).eq('id', fileRef.id)

      await supabase.from('activity_log').insert({
        show_id: episode.show_id,
        episode_id: fileRef.episode_id,
        action: 'frameio_label_updated',
        description: `Frame.io status changed to '${newLabel}' on '${fileRef.name}'`,
        metadata: { provider: providerName, file_reference_id: fileRef.id, label: newLabel },
      })
    }
  }

  if (eventType === 'file.ready') {
    const fileData = payload.resource as Record<string, unknown>
    const thumb = (fileData?.thumb_360 || fileData?.thumb || fileData?.thumbnail_url) as string | undefined
    if (thumb) {
      await supabase.from('file_references').update({ thumbnail_url: thumb }).eq('id', fileRef.id)

      if (fileRef.episode_id) {
        const { data: ep } = await supabase
          .from('episodes')
          .select('image_url')
          .eq('id', fileRef.episode_id)
          .single()
        if (ep && !ep.image_url) {
          await supabase.from('episodes').update({ image_url: thumb }).eq('id', fileRef.episode_id)
        }
      }
    }
  }

  if (eventType === 'share.viewed' && episode) {
    await supabase.from('activity_log').insert({
      show_id: episode.show_id,
      episode_id: fileRef.episode_id,
      action: 'frameio_share_viewed',
      description: `Review link for '${fileRef.name}' was viewed`,
      metadata: { provider: providerName, file_reference_id: fileRef.id },
    })
  }

  await supabase.from('webhook_events').update({ processed_at: new Date().toISOString() })
    .eq('provider', providerName)
    .eq('external_id', eventId || resourceId)
    .eq('event_type', eventType)
    .is('processed_at', null)

  return NextResponse.json({ received: true })
}

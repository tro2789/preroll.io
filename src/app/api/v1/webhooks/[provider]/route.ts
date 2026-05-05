import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getProvider, isValidProvider } from '@/lib/integrations/registry'
import { ensureProvidersRegistered } from '@/lib/integrations/init'

function getServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )
}

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

  const supabase = getServiceClient()

  await supabase.from('webhook_events').insert({
    provider: providerName,
    event_type: eventType,
    external_id: resourceId || null,
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
    .eq('external_id', resourceId)
    .eq('event_type', eventType)
    .is('processed_at', null)

  return NextResponse.json({ received: true })
}

import { createHmac, randomUUID } from 'crypto'
import { createServiceClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/integrations/crypto'

export type WebhookEvent =
  | 'episode.status_changed'
  | 'episode.stage_changed'
  | 'episode.published'
  | 'episode.scheduled'
  | 'deliverable.submitted'
  | 'deliverable.approved'
  | 'deliverable.revision_requested'
  | 'deliverable.resubmitted'

interface WebhookPayload {
  id: string
  event: WebhookEvent
  created_at: string
  data: Record<string, unknown>
}


function sign(payload: string, secret: string, timestamp: number): string {
  const message = `${timestamp}.${payload}`
  return createHmac('sha256', secret).update(message).digest('hex')
}

export function dispatchWebhooks(
  orgId: string,
  event: WebhookEvent,
  data: Record<string, unknown>
): void {
  // Fire-and-forget — don't block the API response
  doDispatch(orgId, event, data).catch(() => {})
}

async function doDispatch(
  orgId: string,
  event: WebhookEvent,
  data: Record<string, unknown>
) {
  const supabase = createServiceClient()

  const { data: endpoints } = await supabase
    .from('webhook_endpoints')
    .select('id, url, secret_enc, events')
    .eq('org_id', orgId)
    .eq('is_active', true)

  if (!endpoints?.length) return

  const matching = endpoints.filter(
    (ep) => ep.events.length === 0 || ep.events.includes(event)
  )
  if (!matching.length) return

  const payload: WebhookPayload = {
    id: randomUUID(),
    event,
    created_at: new Date().toISOString(),
    data,
  }
  const body = JSON.stringify(payload)
  const timestamp = Math.floor(Date.now() / 1000)

  await Promise.allSettled(
    matching.map(async (endpoint) => {
      let statusCode: number | null = null
      let responseBody: string | null = null
      let error: string | null = null

      try {
        const secret = decrypt(endpoint.secret_enc)
        const signature = sign(body, secret, timestamp)

        const res = await fetch(endpoint.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-PreRoll-Signature': `sha256=${signature}`,
            'X-PreRoll-Timestamp': String(timestamp),
            'X-PreRoll-Event': event,
          },
          body,
          signal: AbortSignal.timeout(10_000),
        })

        statusCode = res.status
        responseBody = await res.text().catch(() => null)
      } catch (err) {
        error = err instanceof Error ? err.message : 'Unknown error'
      }

      await supabase.from('webhook_deliveries').insert({
        endpoint_id: endpoint.id,
        event_type: event,
        payload,
        status_code: statusCode,
        response_body: responseBody?.slice(0, 4096),
        error,
      })
    })
  )
}

export default function WebhooksDocs() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Webhooks</h1>
        <p className="mt-2 text-sm text-text-secondary leading-relaxed">
          PreRoll fires signed HTTP POST requests to your configured endpoints when events
          occur — episode status changes, deliverables approved, episodes published, and more.
          Configure endpoints in{' '}
          <a href="/app/settings/developer?tab=webhooks" className="text-accent hover:text-accent-hover underline">
            Settings &rarr; Developer &rarr; Webhooks
          </a>.
        </p>
      </div>

      <Section title="Events">
        <p>
          Subscribe to all events or pick specific ones per endpoint. An empty events
          list means all events are delivered.
        </p>
        <Table
          headers={['Event', 'Fired when']}
          rows={[
            ['episode.status_changed', 'Episode status changes (planning, recording, editing, etc.)'],
            ['episode.stage_changed', 'Episode moves to a different pipeline stage'],
            ['episode.published', 'Episode published to Transistor'],
            ['episode.scheduled', 'Episode scheduled for future publish'],
            ['deliverable.submitted', 'New deliverable submitted for review'],
            ['deliverable.approved', 'Client approves a deliverable'],
            ['deliverable.revision_requested', 'Client requests revisions'],
            ['deliverable.resubmitted', 'Deliverable resubmitted after revision'],
          ]}
        />
      </Section>

      <Section title="Payload format">
        <p>
          Every webhook POST has a JSON body with this structure:
        </p>
        <Code>{`{
  "id": "a1b2c3d4-...",
  "event": "episode.status_changed",
  "created_at": "2026-05-07T12:00:00.000Z",
  "data": {
    "episode_id": "...",
    "show_id": "...",
    "title": "Episode 42",
    "old_status": "editing",
    "new_status": "review"
  }
}`}</Code>
        <p>
          The <Mono>id</Mono> field is unique per delivery — use it for idempotency on your end.
          The <Mono>data</Mono> object varies by event type but always includes the relevant
          entity IDs.
        </p>
      </Section>

      <Section title="Request headers">
        <Table
          headers={['Header', 'Description']}
          rows={[
            ['X-PreRoll-Signature', 'HMAC-SHA256 signature: sha256=<hex>'],
            ['X-PreRoll-Timestamp', 'Unix timestamp (seconds) when the payload was signed'],
            ['X-PreRoll-Event', 'Event type, e.g. episode.status_changed'],
            ['Content-Type', 'application/json'],
          ]}
        />
      </Section>

      <Section title="Verifying signatures">
        <p>
          Each endpoint gets a unique signing secret (shown once at creation). The signature
          covers the timestamp and body to prevent tampering and replay attacks.
        </p>
        <H3>How it works</H3>
        <ol className="list-decimal list-inside space-y-1 text-sm text-text-secondary">
          <li>Concatenate the timestamp and raw request body: <Mono>{'{timestamp}.{body}'}</Mono></li>
          <li>HMAC-SHA256 the result with your endpoint secret</li>
          <li>Compare to the hex value after <Mono>sha256=</Mono> in the signature header</li>
        </ol>
        <H3>Node.js example</H3>
        <Code>{`import { createHmac } from 'crypto'

function verifySignature(rawBody, secret, signatureHeader, timestamp) {
  const expected = createHmac('sha256', secret)
    .update(\`\${timestamp}.\${rawBody}\`)
    .digest('hex')
  return signatureHeader === \`sha256=\${expected}\`
}

// In your webhook handler:
const isValid = verifySignature(
  rawBody,
  process.env.PREROLL_WEBHOOK_SECRET,
  req.headers['x-preroll-signature'],
  req.headers['x-preroll-timestamp']
)`}</Code>
        <H3>Python example</H3>
        <Code>{`import hmac, hashlib

def verify_signature(raw_body, secret, signature_header, timestamp):
    message = f"{timestamp}.{raw_body}"
    expected = hmac.new(
        secret.encode(), message.encode(), hashlib.sha256
    ).hexdigest()
    return signature_header == f"sha256={expected}"`}</Code>
      </Section>

      <Section title="n8n setup">
        <p>
          To receive PreRoll webhooks in n8n:
        </p>
        <ol className="list-decimal list-inside space-y-1 text-sm text-text-secondary">
          <li>Add a <strong>Webhook</strong> node — copy its URL</li>
          <li>In PreRoll, go to Settings &rarr; Webhooks &rarr; Add Endpoint</li>
          <li>Paste the n8n webhook URL and select the events you want</li>
          <li>Copy the signing secret and store it in n8n credentials if you want to verify signatures</li>
        </ol>
      </Section>

      <Section title="Retry behavior">
        <p>
          Webhooks are fire-and-forget with a 10-second timeout. If your endpoint returns
          a non-2xx status or times out, the delivery is logged as failed. There are no
          automatic retries — if you need guaranteed delivery, use the delivery log API
          to check for failures:
        </p>
        <Code>{`GET /api/v1/webhook-endpoints/{id}/deliveries?limit=50`}</Code>
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
      <div className="space-y-3 text-sm text-text-secondary leading-relaxed">{children}</div>
    </section>
  )
}

function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-medium text-text-primary pt-1">{children}</h3>
}

function Mono({ children }: { children: React.ReactNode }) {
  return <code className="rounded bg-surface-overlay px-1.5 py-0.5 font-mono text-xs text-accent">{children}</code>
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <pre className="overflow-x-auto rounded-lg bg-surface-overlay px-4 py-3 font-mono text-xs text-text-secondary leading-relaxed">
      {children}
    </pre>
  )
}

function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border-subtle">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-subtle bg-surface-raised">
            {headers.map((h) => (
              <th key={h} className="px-4 py-2 text-left text-xs font-medium text-text-tertiary">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={i !== rows.length - 1 ? 'border-b border-border-subtle' : ''}>
              {row.map((cell, j) => (
                <td key={j} className={`px-4 py-2 ${j === 0 ? 'font-mono text-xs text-accent' : 'text-text-secondary'}`}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

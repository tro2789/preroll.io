const EVENTS = [
  { name: 'episode.status_changed', desc: 'Episode status changes (planning, recording, editing, etc.)' },
  { name: 'episode.stage_changed', desc: 'Episode moves to a different pipeline stage' },
  { name: 'episode.published', desc: 'Episode is published to Transistor' },
  { name: 'episode.scheduled', desc: 'Episode is scheduled for future publish' },
  { name: 'deliverable.submitted', desc: 'New deliverable submitted for review' },
  { name: 'deliverable.approved', desc: 'Client approves a deliverable' },
  { name: 'deliverable.revision_requested', desc: 'Client requests revisions on a deliverable' },
  { name: 'deliverable.resubmitted', desc: 'Deliverable resubmitted after revision' },
]

const PAYLOAD_EXAMPLE = `{
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
}`

const VERIFY_EXAMPLE = `import { createHmac } from 'crypto'

function verifySignature(body, secret, signature, timestamp) {
  const expected = createHmac('sha256', secret)
    .update(\`\${timestamp}.\${body}\`)
    .digest('hex')
  return signature === \`sha256=\${expected}\`
}

// In your handler:
const isValid = verifySignature(
  rawBody,
  process.env.PREROLL_WEBHOOK_SECRET,
  req.headers['x-preroll-signature'],
  req.headers['x-preroll-timestamp']
)`

export function WebhookGuide() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
          Quick Start
        </h2>
        <div className="mt-3 rounded-lg border border-border-subtle bg-surface-raised p-5 space-y-4">
          <div>
            <h3 className="text-sm font-medium text-text-primary">How it works</h3>
            <p className="mt-1 text-xs text-text-secondary leading-relaxed">
              When events occur in PreRoll (episode status changes, deliverables approved, etc.),
              a signed HTTP POST is sent to each active endpoint that subscribes to that event.
              Each payload includes a unique ID for idempotency and an HMAC-SHA256 signature for verification.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-text-primary">Request headers</h3>
            <div className="mt-2 space-y-1">
              {[
                ['X-PreRoll-Signature', 'sha256=<hmac>', 'HMAC-SHA256 of timestamp.body using your signing secret'],
                ['X-PreRoll-Timestamp', 'Unix seconds', 'Include in signature verification to prevent replay attacks'],
                ['X-PreRoll-Event', 'event name', 'The event type, e.g. episode.status_changed'],
              ].map(([header, value, desc]) => (
                <div key={header} className="flex gap-2 text-xs">
                  <code className="shrink-0 font-mono text-accent">{header}</code>
                  <span className="text-text-tertiary">—</span>
                  <span className="text-text-secondary">{desc} (<code className="font-mono text-text-tertiary">{value}</code>)</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-text-primary">Example payload</h3>
            <pre className="mt-2 overflow-x-auto rounded bg-surface-overlay px-4 py-3 font-mono text-xs text-text-secondary leading-relaxed">
              {PAYLOAD_EXAMPLE}
            </pre>
          </div>

          <div>
            <h3 className="text-sm font-medium text-text-primary">Verify signatures (Node.js)</h3>
            <pre className="mt-2 overflow-x-auto rounded bg-surface-overlay px-4 py-3 font-mono text-xs text-text-secondary leading-relaxed">
              {VERIFY_EXAMPLE}
            </pre>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
          Available Events
        </h2>
        <div className="mt-3 rounded-lg border border-border-subtle bg-surface-raised overflow-hidden">
          {EVENTS.map((evt, i) => (
            <div
              key={evt.name}
              className={`flex items-start gap-3 px-5 py-3 ${
                i !== EVENTS.length - 1 ? 'border-b border-border-subtle' : ''
              }`}
            >
              <code className="shrink-0 rounded bg-surface-overlay px-2 py-0.5 font-mono text-xs text-accent">
                {evt.name}
              </code>
              <span className="text-xs text-text-secondary">{evt.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function ApiKeysDocs() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">API Keys</h1>
        <p className="mt-2 text-sm text-text-secondary leading-relaxed">
          API keys let you authenticate with the PreRoll API from scripts, the MCP server,
          or any external tool. Create and manage keys in{' '}
          <a href="/app/settings/api-keys" className="text-accent hover:text-accent-hover underline">
            Settings &rarr; API Keys
          </a>.
        </p>
      </div>

      <Section title="Authentication">
        <p>
          Pass your API key in the <Mono>Authorization</Mono> header:
        </p>
        <Code>{`curl https://api.preroll.io/api/v1/dashboard \\
  -H "Authorization: Bearer pr_your_key_here"`}</Code>
        <p>
          Keys are prefixed with <Mono>pr_</Mono> for easy identification. The raw key
          is only shown once at creation — PreRoll stores a SHA-256 hash.
        </p>
      </Section>

      <Section title="Response format">
        <p>All endpoints return JSON with a consistent envelope:</p>
        <Code>{`// Success
{ "data": { ... } }       // 200 or 201

// Error
{ "error": "message" }    // 400, 401, 403, 404, 500

// Delete
(empty body)               // 204`}</Code>
      </Section>

      <Section title="Endpoints">
        <p>
          The full API surface is available with key auth. Key endpoints for getting started:
        </p>
        <Table
          headers={['Method', 'Path', 'Description']}
          rows={[
            ['GET', '/api/v1/dashboard', 'Overview: in-progress episodes, deadlines, stats'],
            ['GET', '/api/v1/clients', 'List all clients'],
            ['GET', '/api/v1/shows', 'List all shows'],
            ['GET', '/api/v1/episodes', 'List episodes (supports ?from, ?to, ?status, ?show_id)'],
            ['GET', '/api/v1/deliverables', 'List deliverables (supports ?status, ?episode_id)'],
            ['POST', '/api/v1/shows/{id}/episodes', 'Create an episode'],
            ['PATCH', '/api/v1/shows/{id}/episodes/{id}', 'Update episode (stage, status, etc.)'],
          ]}
        />
      </Section>

      <Section title="Rate limits">
        <p>
          There are no enforced rate limits currently. Be reasonable — the API is backed
          by Supabase with connection pooling.
        </p>
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
              <th key={h} className="px-4 py-2 text-left text-xs font-medium text-text-tertiary">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={i !== rows.length - 1 ? 'border-b border-border-subtle' : ''}>
              {row.map((cell, j) => (
                <td key={j} className={`px-4 py-2 ${j <= 1 ? 'font-mono text-xs text-accent' : 'text-text-secondary'}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

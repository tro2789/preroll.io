export default function McpDocs() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">MCP Server</h1>
        <p className="mt-2 text-sm text-text-secondary leading-relaxed">
          The PreRoll MCP server lets AI assistants (Claude, etc.) interact with your
          PreRoll data — list episodes, create clients, check dashboard status, and more.
          It runs locally and authenticates with an{' '}
          <a href="/app/docs/api-keys" className="text-accent hover:text-accent-hover underline">API key</a>.
        </p>
      </div>

      <Section title="Setup">
        <H3>1. Create an API key</H3>
        <p>
          Go to{' '}
          <a href="/app/settings/api-keys" className="text-accent hover:text-accent-hover underline">
            Settings &rarr; API Keys
          </a>{' '}
          and create a key. Copy it — you&apos;ll need it in the next step.
        </p>

        <H3>2. Build the server</H3>
        <Code>{`cd mcp
npm install
npm run build`}</Code>

        <H3>3. Configure your MCP client</H3>
        <p>Add to your <Mono>.mcp.json</Mono> (Claude Code) or MCP client config:</p>
        <Code>{`{
  "mcpServers": {
    "preroll": {
      "command": "node",
      "args": ["/path/to/preroll/mcp/dist/index.js"],
      "env": {
        "PREROLL_API_KEY": "pr_your_key_here",
        "PREROLL_BASE_URL": "https://api.preroll.io"
      }
    }
  }
}`}</Code>
        <p>
          <Mono>PREROLL_BASE_URL</Mono> defaults to <Mono>https://api.preroll.io</Mono> if
          not set. For local development, use <Mono>http://localhost:3003</Mono>.
        </p>
      </Section>

      <Section title="Available tools">
        <Table
          headers={['Tool', 'Description']}
          rows={[
            ['get_dashboard', 'Overview: in-progress episodes, upcoming deadlines, recent activity, stats'],
            ['list_clients', 'List all clients'],
            ['get_client', 'Get a client by ID'],
            ['create_client', 'Create a new client'],
            ['update_client', 'Update client fields'],
            ['list_shows', 'List shows, optionally filtered by client'],
            ['get_show', 'Get a show with pipeline stages'],
            ['create_show', 'Create a show (auto-creates default stages)'],
            ['update_show', 'Update show fields'],
            ['list_episodes', 'List episodes across all shows with date/status filters'],
            ['get_episode', 'Get an episode by ID'],
            ['create_episode', 'Create an episode (applies show template if set)'],
            ['update_episode', 'Update episode — changing stage_id moves it in the pipeline'],
            ['list_deliverables', 'List deliverables with status/episode filters'],
            ['create_deliverable', 'Create a deliverable for review'],
            ['update_deliverable', 'Approve, request revision, or edit a deliverable'],
            ['get_activity', 'Recent activity log for a show'],
            ['list_tags', 'List all tags'],
            ['create_tag', 'Create a tag'],
            ['list_stages', 'List pipeline stages for a show'],
            ['list_notes', 'List meeting notes for a client'],
            ['create_note', 'Create a meeting note'],
          ]}
        />
      </Section>

      <Section title="Example usage">
        <p>Once configured, you can ask your AI assistant things like:</p>
        <ul className="list-disc list-inside space-y-1 text-sm text-text-secondary">
          <li>&ldquo;What&apos;s on my dashboard today?&rdquo;</li>
          <li>&ldquo;List all episodes in review across my shows&rdquo;</li>
          <li>&ldquo;Create a new episode for Brain Waves called &apos;The Sleep Episode&apos;&rdquo;</li>
          <li>&ldquo;Move episode 42 to the Editing stage&rdquo;</li>
          <li>&ldquo;What deliverables are pending approval?&rdquo;</li>
          <li>&ldquo;Add a meeting note for Acme Corp about the new season plan&rdquo;</li>
        </ul>
        <p>
          The assistant will call the appropriate MCP tools behind the scenes. Start
          with <Mono>get_dashboard</Mono> for the best situational awareness.
        </p>
      </Section>

      <Section title="Environment variables">
        <Table
          headers={['Variable', 'Required', 'Description']}
          rows={[
            ['PREROLL_API_KEY', 'Yes', 'Your API key (starts with pr_)'],
            ['PREROLL_BASE_URL', 'No', 'API base URL (default: https://api.preroll.io)'],
          ]}
        />
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
              <th key={h} className="px-4 py-2 text-left text-xs font-medium text-text-tertiary">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={i !== rows.length - 1 ? 'border-b border-border-subtle' : ''}>
              {row.map((cell, j) => (
                <td key={j} className={`px-4 py-2 ${j === 0 ? 'font-mono text-xs text-accent' : 'text-text-secondary'}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

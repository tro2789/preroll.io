export default function SelfHostingDocs() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Self-Hosting</h1>
        <p className="mt-2 text-sm text-text-secondary leading-relaxed">
          PreRoll can be fully self-hosted. Set <Mono>PREROLL_SELF_HOSTED=true</Mono> and
          you get every feature with no plan limits and no billing integration required.
          You handle infrastructure, OAuth app registrations, and updates.
        </p>
      </div>

      <Section title="What you get">
        <p>
          Self-hosted PreRoll has <strong>no plan restrictions</strong>. All features are
          unlocked: unlimited clients, shows, integrations, webhooks, API keys, MCP access,
          templates, and client portal. The <Mono>PREROLL_SELF_HOSTED=true</Mono> flag
          bypasses all entitlement checks entirely.
        </p>
        <H3>Organization auto-creation</H3>
        <p>
          When the first user signs up on a self-hosted instance, an organization is
          automatically created and the user is assigned as owner. All data (clients,
          shows, episodes) is scoped to this organization. No manual setup required.
        </p>
        <H3>What&apos;s NOT needed</H3>
        <Table
          headers={['Variable', "Why it's optional"]}
          rows={[
            ['STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_*_PRICE_ID', 'Billing is bypassed in self-hosted mode'],
            ['RESEND_API_KEY', 'Only needed if you want email notifications. Magic-link auth is handled by Supabase SMTP, not Resend'],
          ]}
        />
        <p>
          You <em>do</em> still need Supabase, R2 (or S3-compatible storage), and
          an <Mono>INTEGRATION_ENCRYPTION_KEY</Mono>. OAuth app credentials are only
          needed for integrations you actually use.
        </p>
      </Section>

      <Section title="What you need">
        <Table
          headers={['Component', 'Purpose', 'Options']}
          rows={[
            ['Supabase', 'Database, auth, RLS', 'Self-hosted (Docker) or Supabase cloud (free tier)'],
            ['Cloudflare R2', 'Asset storage (thumbnails, intros, cover art)', 'Any S3-compatible storage works'],
            ['Node.js host', 'Runs the Next.js app', 'Vercel, Docker, VPS, etc.'],
            ['SMTP provider', 'Magic-link emails for client portal', 'Resend, Postmark, SES, any SMTP'],
          ]}
        />
        <p>
          For integrations, you&apos;ll also need to register your own OAuth apps with
          each provider you plan to use (Frame.io, Google Drive, Vimeo).
        </p>
      </Section>

      <Section title="1. Set up Supabase">
        <H3>Option A: Self-hosted with Docker (fully self-contained)</H3>
        <p>
          Supabase provides an official Docker Compose stack. This runs Postgres, Auth,
          PostgREST, and the API gateway locally.
        </p>
        <Code>{`# Clone the Supabase Docker setup
git clone --depth 1 https://github.com/supabase/supabase.git
cd supabase/docker

# Generate secrets (JWT_SECRET, ANON_KEY, SERVICE_ROLE_KEY)
cp .env.example .env
./utils/generate-keys.sh

# Edit .env — set SITE_URL to your PreRoll app URL
# Edit .env — configure SMTP for magic-link auth

# Start (minimal: comment out storage, imgproxy, functions,
# realtime, analytics, vector in docker-compose.yml)
docker compose up -d`}</Code>
        <p>
          The minimal stack needs about 2-3 GB RAM: Postgres, GoTrue (auth),
          PostgREST, Kong (API gateway), and the connection pooler.
        </p>

        <H3>Option B: Supabase cloud</H3>
        <p>
          Create a project at{' '}
          <a href="https://supabase.com" className="text-accent hover:text-accent-hover" target="_blank" rel="noopener noreferrer">supabase.com</a>.
          The free tier works for small deployments. Copy your project URL, anon key,
          and service role key from the dashboard.
        </p>
      </Section>

      <Section title="2. Run migrations">
        <p>
          PreRoll&apos;s schema is defined in migration files under <Mono>supabase/migrations/</Mono>.
          Apply them to your Supabase instance:
        </p>
        <Code>{`# Install the Supabase CLI if you haven't
npm install -g supabase

# Push migrations to your database
supabase db push --db-url "postgresql://postgres:YOUR_PASSWORD@localhost:5432/postgres"

# For Supabase cloud, find the connection string in your
# project settings under Database > Connection String`}</Code>
        <p>
          This creates all tables, RLS policies, enums, and indexes. The CLI tracks
          which migrations have been applied and skips duplicates.
        </p>
      </Section>

      <Section title="3. Configure environment">
        <p>
          Create a <Mono>.env.local</Mono> file with these variables:
        </p>
        <Code>{`# Self-hosted mode — bypasses all plan/billing checks
PREROLL_SELF_HOSTED=true

# Supabase
NEXT_PUBLIC_SUPABASE_URL=http://localhost:8000      # or your Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...                # from generate-keys.sh or dashboard
SUPABASE_SERVICE_ROLE_KEY=eyJ...                    # from generate-keys.sh or dashboard

# Cloudflare R2 (or any S3-compatible storage)
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=preroll-assets
R2_PUBLIC_URL=                                       # public bucket URL for serving assets

# Encryption key for storing API keys and integration tokens
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
INTEGRATION_ENCRYPTION_KEY=

# Stripe (not needed for self-hosted — billing is bypassed)
# STRIPE_SECRET_KEY=
# STRIPE_WEBHOOK_SECRET=
# STRIPE_PRO_MONTHLY_PRICE_ID=
# STRIPE_PRO_ANNUAL_PRICE_ID=
# STRIPE_STUDIO_MONTHLY_PRICE_ID=
# STRIPE_STUDIO_ANNUAL_PRICE_ID=

# Email (optional — only needed for email notifications)
# Magic-link auth uses Supabase SMTP, not this key
# RESEND_API_KEY=

# Optional: integrations (register your own OAuth apps)
FRAMEIO_CLIENT_ID=
FRAMEIO_CLIENT_SECRET=
GOOGLE_DRIVE_CLIENT_ID=
GOOGLE_DRIVE_CLIENT_SECRET=
VIMEO_CLIENT_ID=
VIMEO_CLIENT_SECRET=`}</Code>
        <p>
          The only variable unique to self-hosted is <Mono>PREROLL_SELF_HOSTED=true</Mono>.
          When set, all entitlement checks return unlimited, and the Stripe/billing
          code paths are skipped entirely.
        </p>
      </Section>

      <Section title="4. Deploy the app">
        <H3>Option A: Docker</H3>
        <Code>{`# From the PreRoll repo root
docker build -t preroll .
docker run -p 3003:3000 --env-file .env.local preroll`}</Code>

        <H3>Option B: Vercel</H3>
        <p>
          Fork the repo, connect it to Vercel, and add the environment variables
          in the Vercel dashboard. Builds and deploys automatically on push.
        </p>

        <H3>Option C: Any Node.js host</H3>
        <Code>{`npm install
npm run build
npm start`}</Code>
      </Section>

      <Section title="5. Register OAuth apps (optional)">
        <p>
          If you want integrations with Frame.io, Google Drive, or Vimeo, you need
          to register OAuth applications with each provider. Set the callback URL
          to <Mono>{'https://your-domain.com/auth/integrations/{provider}/callback'}</Mono>.
        </p>
        <Table
          headers={['Provider', 'Developer Console', 'Callback Path']}
          rows={[
            ['Frame.io', 'developer.frame.io', '/auth/integrations/frame_io/callback'],
            ['Google Drive', 'console.cloud.google.com', '/auth/integrations/google_drive/callback'],
            ['Vimeo', 'developer.vimeo.com', '/auth/integrations/vimeo/callback'],
          ]}
        />
        <p>
          Transistor.fm uses API keys (not OAuth), configured per-show in the
          Distribution settings. No app registration needed.
        </p>
      </Section>

      <Section title="6. Configure auth">
        <p>
          For magic-link auth (client portal invites), configure SMTP in your
          Supabase instance:
        </p>
        <ul className="list-disc list-inside space-y-1 text-sm text-text-secondary">
          <li><strong>Self-hosted:</strong> Set the <Mono>SMTP_*</Mono> variables in your Supabase <Mono>.env</Mono></li>
          <li><strong>Supabase cloud:</strong> Configure under Authentication &rarr; Email Templates in the dashboard</li>
        </ul>
        <p>
          Resend, Postmark, and Amazon SES all work. You need a verified sending domain.
        </p>
      </Section>

      <Section title="System requirements">
        <Table
          headers={['Resource', 'Minimum', 'Recommended']}
          rows={[
            ['RAM', '2 GB (app only) / 4 GB (with Supabase)', '8 GB+'],
            ['CPU', '2 cores', '4 cores'],
            ['Disk', '20 GB SSD', '50 GB+ SSD'],
            ['Node.js', 'v18+', 'v22+'],
          ]}
        />
      </Section>

      <Section title="Updating">
        <p>
          Pull the latest code and run new migrations:
        </p>
        <Code>{`git pull
npm install
npm run build
supabase db push --db-url "postgresql://postgres:PASSWORD@localhost:5432/postgres"

# Restart the app
npm start`}</Code>
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
                <td key={j} className="px-4 py-2 text-text-secondary">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

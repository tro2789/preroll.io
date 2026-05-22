# PreRoll.io

Production management platform for podcast producers who run multiple client shows. Track episodes through your pipeline, collect approvals, manage assets, publish — one place.

**[preroll.io](https://preroll.io)** · [Docs](https://preroll.io/docs) · [Self-Hosting Guide](https://preroll.io/docs/developer/self-hosting)

## What it does

PreRoll.io is the orchestration layer for podcast production services. It doesn't replace your editing tools, review platform, or hosting provider — it connects them and gives you the single source of truth for where everything is.

- **Episode pipeline** with customizable stages per show and drag-and-drop kanban board
- **Client portal** with magic-link auth, deliverable approvals, activity feed, and white-label branding
- **Built-in file storage** backed by Cloudflare R2 with multipart uploads and per-org quotas
- **Integrations** with Frame.io, Google Drive, Vimeo, YouTube, Transistor.fm, and Castopod
- **AI transcription** via Deepgram Nova-2 with speaker diarization
- **AI content generation** — show notes and title suggestions from transcripts (Claude Sonnet/Haiku)
- **AI chat assistant** with streaming responses and tool use for managing episodes, shows, and clients from natural language
- **Calendar** view across all shows (week and month)
- **Reporting** — episode volume, on-time rate, approval turnaround, broken down by show and month
- **Multi-user workspaces** with role-based access (owner, admin, member)
- **Webhooks** with signed payloads on every status change
- **REST API** with key-based auth for scripting and automation
- **MCP server** for AI assistant interaction (Claude, etc.)

## Tech stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js (App Router), TypeScript |
| Database + Auth | Supabase (Postgres, Auth, RLS, Realtime) |
| UI | shadcn/ui (Radix primitives), Tailwind CSS v4 |
| Storage | Cloudflare R2 (built-in), plus Frame.io / Google Drive / Vimeo |
| AI | Anthropic Claude (generation + chat), Deepgram Nova-2 (transcription) |
| Payments | Stripe (subscriptions, credit packs, customer portal) |
| Deployment | Vercel (hosted) or self-hosted |

## Self-hosting

PreRoll.io can be fully self-hosted with all features included. Set `PREROLL_SELF_HOSTED=true` to bypass plan checks and billing.

### Quick start

```bash
# 1. Clone the repo
git clone https://github.com/tro2789/preroll.io.git
cd preroll.io

# 2. Set up Supabase (self-hosted or cloud)
#    See: https://preroll.io/docs/developer/self-hosting

# 3. Run migrations
supabase db push --db-url "postgresql://postgres:PASSWORD@localhost:5432/postgres"

# 4. Configure environment
cp .env.local.example .env.local
# Edit .env.local with your Supabase URL, keys, R2 credentials, etc.

# 5. Install and run
npm install
npm run build
npm start
```

### What you need

- Supabase instance (self-hosted Docker or cloud free tier)
- Cloudflare R2 bucket (or any S3-compatible storage)
- SMTP provider for magic-link emails
- Anthropic API key and Deepgram API key for AI features (bring your own keys)
- OAuth app registrations for external integrations (Frame.io, Google Drive, Vimeo) — optional

Full guide: [preroll.io/docs/developer/self-hosting](https://preroll.io/docs/developer/self-hosting)

## Development

```bash
npm install
npm run dev    # runs on port 3003
```

### MCP server

The MCP server is a separate package in `mcp/` that wraps the REST API.

```bash
cd mcp
npm install
npm run build
```

Configure in your MCP client:

```json
{
  "mcpServers": {
    "preroll": {
      "command": "node",
      "args": ["./mcp/dist/index.js"],
      "env": {
        "PREROLL_API_KEY": "pr_...",
        "PREROLL_BASE_URL": "https://preroll.io"
      }
    }
  }
}
```

### n8n node

The [n8n community node](https://github.com/tro2789/n8n-nodes-preroll) lets you use PreRoll.io as a native node in n8n workflows — create episodes, update clients, run AI pipelines, and trigger workflows on events.

```bash
# Install in n8n via Settings > Community Nodes
n8n-nodes-preroll
```

## Pricing (hosted)

All new accounts start with a 7-day Studio trial.

| Tier | Price | Storage | Highlights |
|------|-------|---------|------------|
| Free | $0/mo | 10 GB | 1 client, 1 show, pipeline, calendar, client portal |
| Pro | $29/mo | 500 GB | Unlimited clients/shows, all integrations, API, webhooks, MCP |
| Studio | $79/mo | 2 TB | Multi-user, white-label portal, reporting |

Annual plans available at ~17% off ($289/yr Pro, $789/yr Studio).

Additional storage: **$19/TB/month** (Pro and Studio).

**AI add-on** (separate from plan tier): prepaid credit packs starting at $9 for 100 credits. Credits cover transcription, content generation, and chat.

Self-hosting is free with all features included.

## License

Source available. Free to use, self-host, and modify for personal or internal business use. You may not resell, redistribute, or offer it as a hosted service. See [LICENSE](LICENSE) for details.

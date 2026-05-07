# PreRoll

Production pipeline for podcast producers who manage multiple client shows. Track episodes, collect approvals, publish. One place.

**[preroll.io](https://preroll.io)** · [Docs](https://preroll.io/docs) · [Self-Hosting Guide](https://preroll.io/docs/self-hosting)

## What it does

PreRoll is the orchestration layer for podcast production services. It doesn't replace your editing tools, review platform, or hosting provider. It connects them and gives you the single source of truth for "where is everything."

- **Episode pipeline** with customizable stages (Planning → Recording → Editing → Review → Approved → Published)
- **Client portal** with magic-link auth, deliverable approvals, and status visibility
- **Integrations** with Frame.io, Google Drive, Vimeo, and Transistor.fm
- **Calendar** view across all shows (week and month)
- **Webhooks** with signed payloads on every status change
- **REST API** with key-based auth for scripting and automation
- **MCP server** for AI assistant interaction (Claude, etc.)
- **Episode templates** with per-show defaults for descriptions and show notes

## Tech stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js (App Router), TypeScript |
| Database + Auth | Supabase (Postgres, Auth, RLS) |
| Storage | Cloudflare R2 |
| Deployment | Vercel (hosted) or self-hosted |

## Self-hosting

PreRoll can be fully self-hosted. You get the same features as the hosted version.

### Quick start

```bash
# 1. Clone the repo
git clone https://github.com/your-org/preroll.git
cd preroll

# 2. Set up Supabase (self-hosted or cloud)
#    See: https://preroll.io/docs/self-hosting

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

### What you handle

- Supabase instance (self-hosted Docker or cloud free tier)
- Cloudflare R2 bucket (or any S3-compatible storage)
- SMTP provider for magic-link emails
- OAuth app registrations if you want integrations (Frame.io, Google Drive, Vimeo)

Full guide: [preroll.io/docs/self-hosting](https://preroll.io/docs/self-hosting)

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
        "PREROLL_BASE_URL": "https://api.preroll.io"
      }
    }
  }
}
```

## Pricing (hosted)

| Tier | Price | Includes |
|------|-------|----------|
| Free | $0/mo | 1 client, 1 show, pipeline, calendar, client portal |
| Pro | $29/mo | Unlimited clients/shows, all integrations, API, webhooks, MCP |
| Studio | $79/mo | Multi-user, white-label portal, reporting, SSO (coming soon) |

Self-hosting is free with all features included.

## License

Source available. Free to use, self-host, and modify for personal or internal business use. You may not resell, redistribute, or offer it as a hosted service. See [LICENSE](LICENSE) for details.

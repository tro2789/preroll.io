# Landing Page Redesign

## Voice & Positioning

**Core positioning:** PreRoll is podcast production infrastructure. API-first, AI-ready, built for producers who automate.

**Voice:** Developer-tool confidence (Stripe/Linear/Vercel energy). Technical throughout — this is for producers who automate, not casual users. No generic SaaS language ("seamless," "powerful," "streamline").

**Target buyer:** Podcast producers and agencies who manage multiple client shows and want to script, automate, or AI-manage their pipeline.

---

## Page Structure

### 1. Navigation

Fixed top bar:
- Logo: "PreRoll"
- Links: Features, Pricing, API Docs
- CTAs: Sign In, Start Free

### 2. Hero

**Headline:** Your podcast pipeline, programmable.

**Subheadline:** API-first episode management for producers and agencies. Track, review, approve, and publish — from the UI, the API, or your AI assistant.

**CTAs:** [Start Free] [View API Docs]

**Visual:** Stylized pipeline mockup showing episodes flowing through production stages (keep existing pipeline visual, refine styling).

### 3. API-First Architecture

**Headline:** Every action is an API call.

**Body:** The UI is a client. So is your script. So is your AI assistant. PreRoll exposes a complete REST API — episodes, clients, approvals, publishing — everything you can do in the dashboard, you can do in code.

**Code example:**
```bash
curl https://api.preroll.io/episodes \
  -d '{"show": "The Basecamp Podcast", "title": "Episode 14", "stage": "editing"}'
```

**Tagline:** Three lines. Episode created. Pipeline updated. Clients notified.

Below the code: minimal grid showing 3-4 key endpoint groups (Episodes, Clients, Shows, Webhooks) with one-line descriptions.

### 4. MCP / AI Assistant

**Headline:** Your AI assistant runs the pipeline.

**Body:** PreRoll ships an MCP server. Connect it to Claude, ChatGPT, or any AI assistant — and manage your production pipeline in natural language.

**Chat mockup** (styled as a conversation):

> **You:** What episodes are in review for the Basecamp show?
>
> **Claude:** Two episodes in review — Ep 14 "Scaling Teams" (waiting on client approval since Tuesday) and Ep 15 "Hiring Right" (uploaded today).
>
> **You:** Move Ep 14 to approved and notify the client.
>
> **Claude:** Done. Ep 14 moved to Approved. Client notification sent.

**Closer:** No dashboard tab-switching. No Slack thread searching. Just ask.

### 5. Webhooks & Integrations

**Headline:** Webhooks in. Webhooks out.

**Body:** Push episode updates to your automation tools. Pull status changes from your review and publishing platforms. Every event is signed, logged, and retryable.

**Two hero integrations:**
- **Frame.io** — Sync review comments and approval status
- **Transistor.fm** — Publish episodes directly from the pipeline

**Subtle link:** More integrations: Google Drive, Vimeo, n8n, Zapier →

**Closer:** Your tools stay. The duct tape goes.

### 6. Built By a Producer

**Headline:** Built by a producer, for producers.

**Body:** PreRoll isn't a project management tool with podcast features bolted on. It's built by someone who manages client shows every week — and got tired of the spreadsheet.

### 7. Pricing

Keep existing three-tier structure (Free / Pro $29 / Studio $79) with monthly/annual toggle. Tighten feature descriptions to match new voice.

### 8. Final CTA

**Headline:** Your pipeline should be programmable.

**Body:** Start free. No credit card required.

**CTAs:** [Start Free] [Read the API Docs]

### 9. Footer

Minimal: Product links, Developer links (API Docs, MCP, Webhooks), Account links.

---

## Anti-Patterns to Avoid

- No "seamless," "powerful," "streamlined," "cutting-edge," "comprehensive"
- No em-dash overuse (flagged as AI-generated)
- No abstract 3D illustrations — show real product UI
- No multiple CTAs competing in the hero — one primary, one secondary
- No logo strips without context
- Simple reading level — converts 6x better than "professional" language

## Design Notes

- Dark mode landing page (matches developer-tool audience)
- Product screenshots over illustrations
- Bold headline typography
- Code snippets should use real PreRoll API patterns (pr_ prefix tokens, actual endpoint shapes)
- Chat mockup should feel like a real AI conversation, not a marketing graphic

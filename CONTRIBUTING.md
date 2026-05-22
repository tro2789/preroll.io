# Contributing to PreRoll.io

Thanks for your interest in contributing. PreRoll.io is source-available software — contributions that improve the project for everyone are welcome.

## Before You Start

- **Bug reports and feature requests** — open an [issue](https://github.com/tro2789/preroll.io/issues) first. This avoids duplicate work and lets us discuss the approach before you invest time.
- **Small fixes** (typos, docs, one-line bugs) — go ahead and open a PR directly.
- **Larger changes** — please open an issue to discuss before submitting a PR. This includes new features, refactors, and anything touching the data model or auth.

## Development Setup

```bash
git clone https://github.com/tro2789/preroll.io.git
cd preroll.io
npm install
cp .env.local.example .env.local
# Fill in your Supabase URL, keys, and R2 credentials
npm run dev    # runs on port 3003
```

You'll need a Supabase project (cloud free tier works) and a Cloudflare R2 bucket. See the [self-hosting guide](https://preroll.io/docs/developer/self-hosting) for full setup details.

## Pull Requests

- Branch from `main`
- Keep PRs focused — one change per PR
- Include a clear description of what changed and why
- Make sure `npx tsc --noEmit` passes (no type errors)
- Test your changes manually in the browser

## Code Style

- TypeScript throughout, no `any` unless absolutely necessary
- Use existing patterns — check how similar features are implemented before inventing new abstractions
- shadcn/ui components from `src/components/ui/` for all UI elements
- Semantic theme tokens for colors (never hardcoded Tailwind colors like `text-red-400`)
- No comments unless the "why" is non-obvious

## License

By contributing, you agree that your contributions will be licensed under the same [source-available license](LICENSE) as the rest of the project.

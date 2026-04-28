# Coding Agent Handoff — Autonomous Memory

> Single entry point for AI coding agents working on **memory.theautonomous.org**. Read this first.

**Last updated:** 2026-04-28
**Maintainer:** abhinav@chainflux.com (`abhinav@matterhorn.so` on GitHub)
**Repo:** `matterhornso/rowboat-web3` (a fork of [rowboatlabs/rowboat](https://github.com/rowboatlabs/rowboat))

---

## What is this repo?

This is a **monorepo fork of rowboat** (the open-source AI coworker). We're building a separate product called **Autonomous Memory** — persistent AI memory for executives — inside `apps/rowboat`. Other apps in this monorepo (`apps/x`, `apps/cli`, `apps/python-sdk`, `apps/docs`, `apps/rowboatx`) are upstream projects we don't actively develop.

**Active path for our work:** `apps/rowboat/` only. Everything else is upstream.

The product launches at `memory.theautonomous.org` and is the sister product to [theautonomous.org](https://theautonomous.org) (the main AI-agents platform). They share Clerk auth.

---

## Read order (before changing any code)

1. **`HANDOFF.md`** (this file) — repo orientation
2. **`/Users/abhinavramesh/theautonomousorg/CONTEXT.md`** — Platform-wide business + engineering context. Read the "Autonomous Memory (Sister Product)" and "Ecosystem Map" sections.
3. **`apps/rowboat/CLAUDE.md`** — memory product engineering conventions
4. **`apps/rowboat/DESIGN.md`** — design system (read before any UI change)
5. **`apps/rowboat/.env.example`** — required env vars
6. **`TODO.md`** (this repo, root) — prioritized backlog for the memory product. Pick the highest unchecked P0 not blocked by user input.

**Do not** read or modify the upstream `README.md` (rowboat marketing) or top-level `CLAUDE.md` (electron `apps/x` docs) for memory-product work. They're useful for context but they're not us.

---

## Product summary (read once, remember)

- **What:** Record meetings → Deepgram transcription → entity extraction (Claude) → MongoDB knowledge graph → query the graph for pre-meeting briefs.
- **Who:** CEOs, COOs, VP Sales — premium executive tooling.
- **Pricing:** Early Access $99/mo, Executive $299/mo. **No free tier.**
- **Entity types:** Person, Conversation, Commitment, Event, Note.
- **Voice pipeline target:** <5s end-to-end (audio upload → entities stored).

## Tech stack (memory product)

| Layer | Tech |
|-------|------|
| Framework | Next.js 15 App Router (Turbopack) |
| Auth | Clerk (`@clerk/nextjs`) — **never use Auth0**, that migration is done |
| DB | MongoDB Atlas (knowledge graph) + Redis (queues, cache) |
| AI | Anthropic Claude via `@ai-sdk/anthropic` (entity extraction + synthesis) |
| Voice | Deepgram (transcription) |
| Storage | AWS S3 (audio files) |
| Payments | Stripe |
| Hosting | Railway (planned) |
| UI | HeroUI (`@heroui/react`) — currently on `2.8.0-beta.10`, needs `framer-motion` peer dep (already added) |

## Environment

Copy `apps/rowboat/.env.example` → `.env.local` and fill in real values. Required for any local boot:

- `MONGODB_URI` (Atlas free M0 tier works for dev)
- `REDIS_URL` (Upstash recommended)
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` + `CLERK_SECRET_KEY` (real, not keyless)
- `USE_AUTH=true`
- `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY` (rowboat agent runtime — required even with Claude as primary)

Required for full feature set:
- `DEEPGRAM_API_KEY`
- `AWS_*` for S3
- `STRIPE_*` (incl. `STRIPE_PRICE_EARLY_ACCESS`, `STRIPE_PRICE_EXECUTIVE`)
- `NEXT_PUBLIC_APP_URL=https://memory.theautonomous.org` (or `http://localhost:3000` in dev)

## Run locally

```bash
cd apps/rowboat
npm install --legacy-peer-deps     # HeroUI 2.8 beta + Clerk 7 conflict, hence --legacy-peer-deps
npm run dev                        # Turbopack on :3000
```

After the first run, set up MongoDB indexes:
```bash
npm run mongodb-ensure-indexes
```

To run the workers (background jobs / RAG):
```bash
npm run jobs-worker     # in one terminal
npm run rag-worker      # in another
```

## Verify it's working

```bash
curl http://localhost:3000/api/health
```

Should return 200 with all checks green. If it returns `localStorage.getItem is not a function`, see the P0 entry in `TODO.md`.

---

## Repo structure (only what matters for memory product)

```
autonomous-memory/
├── HANDOFF.md                    # ← you are here
├── TODO.md                       # ← prioritized backlog
├── README.md                     # upstream rowboat marketing — do not edit
├── CLAUDE.md                     # electron-app context — do not edit
├── railway.json                  # Railway deploy config (rowboat target)
└── apps/
    ├── rowboat/                  # ← OUR WORK LIVES HERE
    │   ├── CLAUDE.md             # memory product conventions
    │   ├── DESIGN.md             # design system (read before UI changes)
    │   ├── .env.example          # required env vars
    │   ├── app/
    │   │   ├── api/
    │   │   │   ├── voice/        # audio upload + Deepgram transcription
    │   │   │   ├── memory/       # knowledge-graph CRUD
    │   │   │   ├── brief/        # pre-meeting brief generation
    │   │   │   ├── fireflies/    # Fireflies.ai sync
    │   │   │   ├── stripe/       # billing checkout/portal/webhook
    │   │   │   └── health/       # healthcheck
    │   │   ├── memory/           # memory product UI pages
    │   │   ├── sign-in/ + sign-up/
    │   │   ├── projects/         # rowboat agent builder (keep, used by rowboat features)
    │   │   ├── lib/
    │   │   │   ├── auth.ts       # Clerk auth helpers
    │   │   │   ├── stripe.ts     # Stripe SDK wrapper
    │   │   │   ├── entity-extraction.ts  # Claude → entities pipeline
    │   │   │   └── fireflies.ts  # Fireflies.ai client
    │   │   └── manifest.ts + pwa-register.tsx + public/sw.js  # PWA
    │   └── src/
    │       ├── entities/models/memory/   # MongoDB schemas for knowledge graph
    │       └── infrastructure/repositories/mongodb.users.repository.ts  # Clerk-aware user repo
    ├── x/                        # Electron app — upstream, ignore for memory work
    ├── cli/, docs/, python-sdk/, rowboatx/, experimental/  # upstream — ignore
```

---

## Cross-app conventions

- **Auth:** Clerk only. The Auth0 migration is complete. If you see `@auth0` imports anywhere, that's a bug — replace with Clerk equivalents.
- **Database boundaries:** memory product uses MongoDB + Redis only. Don't import the main app's Postgres database — call its HTTP API instead if cross-product data is needed.
- **Design system:** `apps/rowboat/DESIGN.md` inherits from `theautonomousorg/DESIGN.md`. Same fonts (Instrument Serif + DM Sans), same gold accent `#D4A853`. Memory product is **dark-first** for recording UI, light-OK for browsing.
- **Secrets:** never commit `.env.local`. Use `apps/rowboat/.env.example` as the canonical reference for what's needed.
- **Node version:** Pin Node 22 LTS. Node 25 has experimental webstorage that breaks Clerk SSR in keyless mode.

---

## When in doubt

- Read `apps/rowboat/CLAUDE.md` for conventions.
- Read `TODO.md` for what to work on.
- Read `theautonomousorg/CONTEXT.md` for the *why*.
- If a task seems to span both products (e.g. shared auth, cross-product data), open an issue or ping the maintainer instead of guessing.

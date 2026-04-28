# Autonomous Memory — Project Conventions

> Engineering conventions for the **memory product** living inside `apps/rowboat`. If you are an AI coding agent and just landed here, **stop** — read `../../HANDOFF.md` (repo root) first for orientation, then `../../TODO.md` for what to work on.

## Coding Agent Read Order

1. `../../HANDOFF.md` — repo orientation, env vars, run commands, what's *us* vs *upstream*
2. `/Users/abhinavramesh/theautonomousorg/CONTEXT.md` § "Autonomous Memory" — business context for the *why*
3. **This file** — engineering conventions
4. `DESIGN.md` (this directory) — design system; read before any UI change
5. `../../TODO.md` — pick a P0

## Project

Persistent AI memory for executives, CEOs, and sales teams. Record meetings, conversations, and commitments — the AI builds a searchable knowledge graph of every person, deal, and decision. Never forget context again.

- **URL (target):** memory.theautonomous.org
- **Part of:** The Autonomous Org ecosystem (sister product to [theautonomous.org](https://theautonomous.org))
- **Auth:** Clerk (planned shared instance with theautonomous.org for SSO)

## Design System

Always read `DESIGN.md` before making any visual or UI decisions. All font choices, colors, spacing, and aesthetic direction are defined there. Do not deviate without explicit user approval.

## Tech Stack

- **Framework:** Next.js 15 App Router (Turbopack in dev)
- **Auth:** Clerk (`@clerk/nextjs`) — **NEVER use Auth0** (migration is complete; if you see `@auth0` imports, treat as a regression to fix)
- **DB:** MongoDB (knowledge graph) + Redis (queues / cache)
- **AI:** Anthropic Claude (entity extraction, synthesis) via `@ai-sdk/anthropic`
- **Voice:** Deepgram (transcription)
- **Storage:** AWS S3 (audio files)
- **Payments:** Stripe (Early Access $99/mo, Executive $299/mo, no free tier)
- **UI library:** HeroUI v2.8 beta — requires `framer-motion` peer dep (already added)
- **Deploy:** Railway

## Key Domain Concepts

- **Recording:** audio file uploaded → Deepgram transcription → entity extraction → MongoDB write
- **Entity types:** Person, Conversation, Commitment, Event, Note
- **Knowledge graph:** entities cross-referenced by ID in MongoDB
- **Pre-meeting brief:** query knowledge graph → Claude synthesis → structured brief
- **Voice pipeline target:** <5s end-to-end (audio upload → entities stored)

## Architecture (active for memory product)

```
app/
  api/
    voice/          # audio upload + Deepgram transcription
    memory/         # knowledge-graph CRUD
    brief/          # pre-meeting brief generation
    fireflies/      # Fireflies.ai sync
    stripe/         # billing checkout, portal, webhook
    health/         # healthcheck (used by Railway)
  memory/           # memory product UI (recording + library + nav)
  sign-in/, sign-up/  # Clerk routes
  projects/         # rowboat agent builder — keep, used by rowboat features that we may surface later
  lib/
    auth.ts                 # Clerk auth helpers
    stripe.ts               # Stripe SDK wrapper
    entity-extraction.ts    # Claude → structured entities
    fireflies.ts            # Fireflies API client
src/
  entities/models/memory/   # MongoDB schemas for knowledge graph
  infrastructure/repositories/mongodb.users.repository.ts  # Clerk-aware user repo
```

## Environment Variables

See `.env.example` for the full list.

**Required for any boot:** `MONGODB_URI`, `REDIS_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `USE_AUTH=true`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`.

**Required for voice pipeline:** `DEEPGRAM_API_KEY`, `AWS_S3_BUCKET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`.

**Required for billing:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_PRICE_EARLY_ACCESS`, `STRIPE_PRICE_EXECUTIVE`.

## Pricing

- Early Access: $99/mo
- Executive: $299/mo
- **No free tier** — premium executive tooling, free tier attracts wrong segment

## Conventions

- **Auth gating:** every memory-product API route should check Clerk auth via `auth()` from `@clerk/nextjs/server` and 401 if no session.
- **Database access:** import the MongoDB client from a singleton (see `src/infrastructure/repositories/mongodb.users.repository.ts` for the pattern). Do not `new MongoClient()` per request.
- **Long-running work** (transcription, entity extraction, brief generation) should run in API routes that return early with a job ID, then a worker (`npm run jobs-worker`) finishes the work and writes to Mongo. The UI polls.
- **Streaming:** use SSE for any user-visible long task (recording → live transcript). See main app's `/api/chat/route.ts` (in the sibling repo) for a reference pattern.
- **Errors:** never silently swallow Mongo / Redis / Deepgram / Claude errors — bubble to Sentry (once wired) and return a 5xx with a clear error code in the body.
- **Secrets policy:** never commit `.env.local`, never log full tokens. Real secrets live only in `.env.local` (gitignored) and Railway dashboard.

## Don't

- ❌ Don't introduce `@auth0/*` packages — the migration is done.
- ❌ Don't import the main app's Postgres database directly — call its HTTP API if cross-product data is needed.
- ❌ Don't edit upstream files in `apps/x/`, `apps/cli/`, `apps/python-sdk/`, `apps/docs/`, `apps/rowboatx/`, or `apps/experimental/` for memory-product work.
- ❌ Don't deviate from `DESIGN.md` without explicit user approval.
- ❌ Don't run plain `npm install` — use `npm install --legacy-peer-deps` until HeroUI ships stable + Clerk 7 peer-dep is resolved.

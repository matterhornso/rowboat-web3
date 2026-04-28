# TODO — Autonomous Memory (rowboat fork)

> Source of truth for outstanding work in **the memory product** (`apps/rowboat`). For main-app work, see `/Users/abhinavramesh/theautonomousorg/TODO.md`. Read `HANDOFF.md` first.

**Last updated:** 2026-04-28
**Maintainer:** abhinav@chainflux.com

## Before you start

1. Read `HANDOFF.md` (repo orientation, env vars, run commands)
2. Read `/Users/abhinavramesh/theautonomousorg/CONTEXT.md` § "Autonomous Memory (Sister Product)" for the *why*
3. Read `apps/rowboat/CLAUDE.md` for engineering conventions
4. Read `apps/rowboat/DESIGN.md` (only if your task touches UI)
5. Then come back here and pick the highest-priority unchecked P0

Mark items complete with `[x]` and add the date.

Section legend:
- 🔴 **P0 — Blocking:** must be done before the product can run / launch
- 🟠 **P1 — High impact:** measurable activation / retention / revenue win
- 🟡 **P2 — Polish:** quality-of-life, technical debt, nice-to-have
- 🔵 **Backlog:** ideas, not yet scoped

---

## 🔴 P0 — Action Items Requiring User (Abhinav)

These cannot be done by a coding agent — they need credentials, account access, or human decisions.

- [ ] **Provision MongoDB Atlas cluster.** Free M0 tier is fine for pilot; pick the same region as Railway deploy (us-east-1 or similar). Create user, allowlist `0.0.0.0/0` for dev. *Required input:* `MONGODB_URI` connection string.
- [ ] **Provision Redis.** Upstash recommended (HTTP API, free tier with persistence). *Required input:* `REDIS_URL` (or `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`).
- [ ] **Create AWS S3 bucket** `autonomous-memory-audio` in `us-east-1`. Configure IAM user with `PutObject` and `GetObject` only (least privilege). Set CORS to allow uploads from `memory.theautonomous.org`. *Required input:* `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`.
- [ ] **Get Deepgram API key** from [console.deepgram.com](https://console.deepgram.com/). Free tier gives $200 of credit. *Required input:* `DEEPGRAM_API_KEY`.
- [ ] **Create Stripe products** for Early Access ($99/mo) and Executive ($299/mo) in [Stripe dashboard](https://dashboard.stripe.com/products). *Required input:* `STRIPE_PRICE_EARLY_ACCESS`, `STRIPE_PRICE_EXECUTIVE`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.
- [ ] **Decide hosting.** Recommended: Railway (already wired in `/railway.json`). Alternatives: Vercel (no MongoDB friendly), Fly.io (good but more setup). *Required input:* hosting decision.
- [ ] **Decide Clerk strategy.** Share the main app's Clerk instance (true SSO across both products) or use a separate Clerk app. Sharing is simpler if you want users to log in once. *Required input:* yes/no decision; if shared, paste the same `pk_live_*` / `sk_live_*` keys used by `theautonomousorg`.
- [ ] **DNS for `memory.theautonomous.org`.** Add a CNAME pointing to the chosen host. *Required input:* DNS access at the registrar (Cloudflare? Namecheap?).
- [ ] **(Optional) Fireflies.ai integration token** if shipping Fireflies sync at launch. *Required input:* `FIREFLIES_API_KEY`.

---

## 🔴 P0 — Bugs / Blockers (Coding Agent Can Do)

- [x] ~~Missing `framer-motion` peer dep blocks rowboat dev server~~ — Installed 2026-04-28.
- [x] ~~Auth0 → Clerk migration~~ — Code complete, committed 2026-04-28.

- [ ] **`localStorage.getItem is not a function` SSR error on Node 25 + Clerk keyless mode.**
  - **Where:** Crashes any SSR render (`/`, `/projects`, etc.) when Clerk is in keyless mode (no `pk_live_*` env). Reproducible with `cd apps/rowboat && npm run dev` then `curl http://localhost:3000/`.
  - **Fix path A (preferred):** Pin Node 22 LTS. Add `"engines": { "node": "22.x" }` to `apps/rowboat/package.json` and create `apps/rowboat/.nvmrc` containing `22.11.0`. Document in `HANDOFF.md`.
  - **Fix path B (also do):** Provide real Clerk keys via `.env.local` so Clerk doesn't enter keyless mode in the first place. This unblocks all auth flows downstream.
  - **Verification:** After fix, `curl http://localhost:3000/api/health` should return 200 healthy, and `curl http://localhost:3000/` should return either 200 or a 307 redirect to `/sign-in` (not 500).

- [ ] **`apps/rowboat/.env.example` lists placeholder secrets that look real.** `pk_live_...` and `sk_live_...` strings can trip secret-scanning tools. Replace with `pk_live_REPLACE_ME` / `sk_live_REPLACE_ME` style.

- [ ] **Healthcheck endpoint doesn't validate downstream services.** `apps/rowboat/app/api/health/route.ts` should attempt a `mongoose.connection.db.admin().ping()` and a Redis `PING` and return `degraded` with per-service detail if either fails (mirror the pattern in `theautonomousorg/src/app/api/health/route.ts`). Required for Railway healthcheck `/railway.json` to be useful.

---

## 🟠 P1 — Voice → Memory Pipeline (Core Product)

The product *is* this pipeline. These tickets together get the MVP working end-to-end.

- [ ] **Implement `/api/voice` upload + transcription.**
  - Accept multipart audio upload, store original in S3 (`AWS_S3_BUCKET`), call Deepgram (`/v1/listen`), persist transcript in MongoDB.
  - Files: `apps/rowboat/app/api/voice/route.ts`, `apps/rowboat/app/lib/entity-extraction.ts`.
  - Acceptance: posting a 60s WAV file returns `{ transcriptId, transcript }` in <8s.

- [ ] **Implement entity extraction.**
  - Take a transcript, call Claude (`@ai-sdk/anthropic`) with a structured-output schema for: Person, Conversation, Commitment, Event, Note.
  - Persist to MongoDB collections under `apps/rowboat/src/entities/models/memory/`.
  - Files: `apps/rowboat/app/lib/entity-extraction.ts`, `apps/rowboat/app/api/memory/route.ts`.
  - Acceptance: a transcript containing "I owe Alex a deck by Friday" produces a `Commitment` entity with `assignee=user`, `recipient=Alex`, `dueDate=Friday's date`.

- [ ] **Implement `/api/brief` (pre-meeting brief).**
  - Input: `{ attendees: string[], meetingTitle: string, scheduledFor: ISO }`
  - Output: structured markdown with: who they are (Person entity summary), prior conversations (Conversation entities), open commitments (Commitment entities filtered by attendee), recent decisions.
  - Files: `apps/rowboat/app/api/brief/route.ts`.
  - Acceptance: brief generation completes in <5s for a person with 10+ prior conversations.

- [ ] **MongoDB indexes for query performance.**
  - Add indexes for: `Person.email`, `Person.linkedinUrl`, `Conversation.attendees`, `Commitment.assignee`, `Commitment.dueDate`, `Event.scheduledFor`.
  - Files: `apps/rowboat/src/infrastructure/repositories/` (create `mongodb.memory.indexes.ts` mirroring `mongodb.users.indexes.ts`).
  - Run via `npm run mongodb-ensure-indexes` after change.

- [ ] **Recording UI client component.**
  - Browser MediaRecorder → POST to `/api/voice` → show transcript + extracted entities live.
  - Files: `apps/rowboat/app/memory/recording-client.tsx` (already created — finish wiring).
  - Acceptance: visiting `/memory`, clicking record, speaking 30s, stopping → see transcript + entity cards within 8s.

---

## 🟠 P1 — Billing + Auth

- [ ] **Stripe checkout for Early Access ($99) and Executive ($299).**
  - File: `apps/rowboat/app/api/stripe/checkout/route.ts`.
  - Pull price IDs from env (`STRIPE_PRICE_EARLY_ACCESS`, `STRIPE_PRICE_EXECUTIVE`).
  - Acceptance: hitting `/api/stripe/checkout` with `{ tier: "executive" }` returns a Stripe Checkout URL.

- [ ] **Stripe webhook → mark user as paid in MongoDB.**
  - File: `apps/rowboat/app/api/stripe/webhook/route.ts`.
  - Listen for `checkout.session.completed` and `customer.subscription.updated`.
  - Update user record (`Users` collection in MongoDB) with `subscription: { tier, status, currentPeriodEnd }`.

- [ ] **Stripe portal link from settings.**
  - File: `apps/rowboat/app/api/stripe/portal/route.ts`.

- [ ] **Pricing page.** Public, links to checkout. Use the same gold-accent CTA pattern as the main app.

- [ ] **Onboarding flow gate.** New users land on `/onboarding` → 3-step wizard: confirm name/role → upload first recording → choose tier (Early Access/Executive) → start trial or pay. Files: `apps/rowboat/app/onboarding/`.

---

## 🟠 P1 — Reliability + Observability

- [ ] **Healthcheck enhancements** (see P0 Bugs section above).
- [ ] **Sentry integration** for error tracking. Wire into `apps/rowboat/app/layout.tsx` (root) and the API routes.
- [ ] **MongoDB connection pooling.** Use a singleton MongoClient (lazy-init) instead of opening a new connection per request. Pattern: `apps/rowboat/src/infrastructure/repositories/mongodb.users.repository.ts` already does this — replicate for memory collections.
- [ ] **Redis connection reuse.** Same pattern, singleton client.
- [ ] **Rate-limit the voice upload endpoint** to prevent abuse (e.g. 10 uploads/min per user). Use Upstash Redis ratelimit if available.

---

## 🟡 P2 — Polish / Tech Debt

- [ ] **Pin Node version.** Add `apps/rowboat/.nvmrc` with `22.11.0` and `engines.node` in `package.json` (also fixes the localStorage P0).
- [ ] **Update HeroUI to stable.** Currently on `2.8.0-beta.10`. Watch for stable release, retest.
- [ ] **Remove `--legacy-peer-deps` workaround.** Once HeroUI is stable + Clerk 7 peer-dep conflict resolves, run plain `npm install`.
- [ ] **Schema doc for MongoDB.** Document each entity collection (Person, Conversation, Commitment, Event, Note) with example documents and indexes. Place in `apps/rowboat/SCHEMA.md` or expand `apps/rowboat/DESIGN.md`.
- [ ] **TypeScript strictness.** Enable `noUncheckedIndexedAccess` in `apps/rowboat/tsconfig.json`. Audit and fix.
- [ ] **Service worker scope.** `apps/rowboat/public/sw.js` is registered globally — verify it doesn't break Clerk auth flows (Clerk uses cross-origin cookies that PWAs sometimes choke on).
- [ ] **PWA install prompt.** Currently `pwa-register.tsx` registers the SW but doesn't show an install button. Add a one-time "Install Memory" prompt on `/memory` after first recording.
- [ ] **Audit unused upstream code.** `apps/rowboat/app/projects/` is the original rowboat agent builder. Decide which parts we keep vs. remove for the memory-only product. *Don't delete blindly* — check `app.tsx` redirects and onboarding flow.

---

## 🔵 Backlog — Ideas

- [ ] **Calendar integration (Google + Microsoft 365).** Auto-trigger pre-meeting brief 15 min before each scheduled event. Push to email + show in `/memory` UI.
- [ ] **Chrome extension.** Capture from Gmail / LinkedIn / WhatsApp Web directly into the knowledge graph.
- [ ] **CRM sync (HubSpot, Salesforce, Pipedrive).** Write extracted entities back as contact notes.
- [ ] **Recall-style "moments" view.** Timeline of past conversations with searchable transcripts.
- [ ] **Voice synthesis brief delivery.** Use ElevenLabs to read the brief aloud — useful for car/drive prep.
- [ ] **Slack integration.** Post pre-meeting briefs to a private channel before each meeting.
- [ ] **Meeting recorder bot.** Join Zoom/Meet/Teams calls automatically (like Otter, Fireflies, Limitless).
- [ ] **Multi-device sync.** If a user records on iOS, the desktop should see it. (Requires native iOS app or PWA + sync.)

---

## Useful commands

```bash
cd apps/rowboat
npm install --legacy-peer-deps        # Install dependencies (HeroUI/Clerk peer-dep conflict)
npm run dev                           # Turbopack dev server on :3000
npm run build                         # Production build
npm run mongodb-ensure-indexes        # Create MongoDB indexes
npm run mongodb-drop-indexes          # Drop MongoDB indexes (dev reset)
npm run setupQdrant                   # Provision Qdrant vector store (only if using RAG)
npm run rag-worker                    # RAG worker (background)
npm run jobs-worker                   # Background jobs worker
```

## Quick references

- Repo: [github.com/matterhornso/rowboat-web3](https://github.com/matterhornso/rowboat-web3)
- Upstream: [github.com/rowboatlabs/rowboat](https://github.com/rowboatlabs/rowboat) (don't push back upstream; we're a hard fork)
- Sister product: [github.com/matterhornso/theautonomousorg](https://github.com/matterhornso/theautonomousorg)
- Target deploy URL: `memory.theautonomous.org`
- Clerk dashboard: [dashboard.clerk.com](https://dashboard.clerk.com)
- MongoDB Atlas: [cloud.mongodb.com](https://cloud.mongodb.com)
- Deepgram console: [console.deepgram.com](https://console.deepgram.com)
- Railway dashboard: [railway.app](https://railway.app)

---

## Recently completed (for context)

- 2026-04-28 — Pushed 9 commits: gitignore, Auth0→Clerk migration, memory product scaffolding (voice/memory/brief/fireflies/health APIs), Stripe + PWA, framer-motion peer-dep fix, design tokens, docs (CLAUDE.md / DESIGN.md / .env.example), railway.json, electron-app updates.
- 2026-04-28 — Added top-level `HANDOFF.md` and `TODO.md` (this file).

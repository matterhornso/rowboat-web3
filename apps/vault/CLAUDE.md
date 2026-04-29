# TA Vault — Project Conventions

> If you're an AI coding agent and just landed here, **stop**. Read these in order before changing code:
>
> 1. `../../HANDOFF.md` (autonomous-memory repo root) — repo orientation
> 2. `../../../theautonomousorg/CONTEXT.md` § "TA Vault" — business context
> 3. `HANDOFF.md` (this directory) — Vault-specific orientation, Day 1 spike
> 4. **This file** — engineering conventions
> 5. `DESIGN.md` (this directory) — design system, read before any UI change
> 6. `TODO.md` (this directory) — pick a P0 not blocked on user input

## Project

Subscription-aware secret manager for founders. Vault holds API keys + the bills attached to them, lets you kill the upstream credential in one click. Sister product to theautonomous.org and memory.theautonomous.org.

- **URL (target):** keys.theautonomous.org
- **Status:** scaffolded 2026-04-29; Day-1 critical-path spike pending
- **Pricing (planned):** TBD by Day 60; success ladder in design doc

## Tech Stack (V1, locked from design + eng review)

| Layer | Choice | Notes |
|-------|--------|-------|
| Framework | Next.js 16 App Router | Same as theautonomousorg parent |
| Runtime | Node 22 LTS | Pinned in package.json `engines` to avoid Node 25 SSR issues |
| Auth | Clerk (`@clerk/nextjs`) | Shared instance with sibling products → SSO |
| DB | Supabase Postgres, schema `vault` | Shared project with theautonomousorg |
| Crypto | AES-256-GCM via `node:crypto` | `ENCRYPTION_KEY` env var (V1); per-user keys V2 |
| Email | Resend | For post-kill cancel-link emails + V1.1 daily digest |
| Gmail | `googleapis` library + OAuth2Client | Auto-refresh; invalid_grant → reconnect banner |
| AI | Anthropic Sonnet (extract) + Haiku (classify) | Receipt parsing pipeline |
| Worker | Standalone Node process | `npm run worker` — Railway worker pattern |
| Hosting | Railway (planned) | Mirrors theautonomousorg + autonomous-memory |
| UI library | Tailwind CSS 4 + native components | NO HeroUI (avoids peer-dep conflicts) |

## Key Conventions

- **DB schema:** all Vault tables live under the `vault` schema in shared Supabase project. Never touch `public.*` tables (those belong to theautonomous.org main app).
- **State transitions:** every kill-flow state transition is an atomic `UPDATE WHERE state = $expected RETURNING *`. Use `lib/db.ts` `transitionState()`. Never bare `UPDATE`.
- **Idempotency:** receipts table has `UNIQUE(user_id, source_email_id)`. Worker uses `INSERT ... ON CONFLICT DO NOTHING`.
- **RLS:** every table has Clerk-JWT-mapped Row-Level Security policies (migrations/0002). All queries filter by `user_id` even though RLS would catch a missing filter — defense in depth.
- **Adapter contract:** revoke adapters are thin wrappers over `withRevokeRetries`. See `lib/adapters/`. Never inline retry logic per-adapter.
- **Service catalog:** canonical service ids match `theautonomousorg/src/lib/suggested-platforms.ts` aliases. New services get added to `lib/parser/services.ts` (TBD) and the SQL canonicalization view.
- **Dark-first:** all dashboard surfaces are dark. Light mode is V2.
- **No emoji, no purple, no decorative gradients.** See DESIGN.md anti-patterns.

## Don't

- ❌ Don't introduce HeroUI, MUI, or any opinionated component lib. Tailwind + the wireframe CSS is enough.
- ❌ Don't write inline retry logic in revoke adapters — use `withRevokeRetries`.
- ❌ Don't bypass the `vault` schema (no queries against `public.*`).
- ❌ Don't store secrets unencrypted, ever, even briefly.
- ❌ Don't ship a UI deviation from `DESIGN.md` without explicit user approval.
- ❌ Don't add a real revoke adapter without curl-verifying the API endpoint first (Day-1 spike pattern).
- ❌ Don't run with Node 25 — use Node 22 LTS (Clerk SSR + experimental webstorage interaction).

## Skill routing

When the user's request matches an available gstack skill, invoke it. Skill > ad-hoc:

- Bug, "why is this broken" → `/investigate`
- Test the running app → `/qa`
- Code review the diff → `/review`
- Visual polish → `/design-review`
- Ship + create PR → `/ship`
- Add backlog item → see TODO.md, append manually
- Architecture question → `/plan-eng-review` against `apps/vault/DESIGN.md`

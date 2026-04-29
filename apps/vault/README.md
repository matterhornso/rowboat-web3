# Vault

**Subscription-aware API key manager for founders.** Vault holds your API keys, knows what each one costs, and lets you kill the upstream credential in one click.

Part of [The Autonomous Org](https://theautonomous.org) ecosystem. Sister product to memory.theautonomous.org.

**Status:** scaffolded 2026-04-29 — Day-1 spike pending. Mock data renders the approved wireframe; real DB + revoke adapters wire up after the Anthropic + Resend revoke API verification.

## Quick start

```bash
cd apps/vault
npm install
cp .env.example .env.local
# Fill in CLERK_SECRET_KEY, ANTHROPIC_API_KEY, ENCRYPTION_KEY at minimum
npm run dev
```

Open http://localhost:3000. Without `DATABASE_URL`, the page renders with mock data so you can iterate on UI without provisioning Supabase.

Generate `ENCRYPTION_KEY`:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Day 1 — critical path

Before any other code, **verify the revoke APIs** work:

```bash
# Anthropic admin keys (UNVERIFIED — confirm endpoint shape)
curl -X DELETE 'https://api.anthropic.com/v1/organizations/api_keys/{key_id}' \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01"

# Resend (documented public API)
curl -X DELETE 'https://api.resend.com/api-keys/{key_id}' \
  -H "Authorization: Bearer $RESEND_API_KEY"
```

Apply to Apollo partner program same day (3-7 day approval). See `HANDOFF.md` for the full spike checklist.

## Project structure

```
apps/vault/
├── app/
│   ├── api/
│   │   ├── health/         # /api/health — Railway healthcheck
│   │   ├── kill/[entryId]/ # The kill endpoint (state machine + adapter dispatch)
│   │   ├── gmail/          # OAuth + receipt poller (V1)
│   │   └── vault/          # CRUD on vault entries (V1)
│   ├── sign-in/, sign-up/  # Clerk routes
│   ├── vault/              # The demo page — see components.tsx
│   ├── layout.tsx          # Root layout, fonts, ClerkProvider
│   └── page.tsx            # Redirects to /vault or /sign-in
├── lib/
│   ├── adapters/           # Per-service revoke adapters (Anthropic, Resend in V1)
│   │   ├── withRetries.ts  # Shared retry/error mapper
│   │   ├── anthropic.ts
│   │   ├── resend.ts
│   │   └── registry.ts
│   ├── parser/             # Receipt extraction pipeline (V1, TBD)
│   ├── crypto.ts           # AES-256-GCM helpers
│   ├── db.ts               # Postgres client + DAL
│   └── types.ts            # Shared types matching the schema
├── migrations/
│   ├── 0001_init.sql       # Schema (vault.users, vault_entries, receipts, etc.)
│   └── 0002_rls.sql        # Row-Level Security with Clerk JWT mapping
├── middleware.ts           # Clerk auth gate
├── DESIGN.md               # Vault design system (inherits from parent)
├── CLAUDE.md               # Engineering conventions for AI agents
├── HANDOFF.md              # Day-1 spike + V1 build sequence
├── TODO.md                 # Backlog: P0 build sequence + V1.1/V2 follow-ups
├── README.md               # this file
└── railway.json            # Deploy config
```

## What works right now

- Vault page renders with mock data matching the approved wireframe
- Sign-in / sign-up via Clerk (when keys are provided)
- `/api/health` returns environment status
- Schema migrations are written and ready to apply

## What does NOT work yet (V1 work, see TODO.md)

- Real DB queries (DATABASE_URL needed + migrations applied)
- Gmail OAuth + receipt parsing
- Real revoke adapters (Day-1 spike pending)
- LLM eval suite for receipt extraction
- E2E Playwright tests

## License

Proprietary — Copyright 2026 Chainflux. All rights reserved.

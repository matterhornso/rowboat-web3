# Coding Agent Handoff — TA Vault

> Single entry point for AI coding agents picking up Vault. Read this first.

**Last updated:** 2026-04-29 (scaffolding complete, V1 build pending Day-1 spike)
**Maintainer:** abhinav@chainflux.com
**Repo:** `matterhornso/rowboat-web3` (autonomous-memory monorepo, sub-app `apps/vault`)
**Target URL:** `keys.theautonomous.org`

---

## Read order

1. **This file** — orientation, Day-1 spike
2. **`/Users/abhinavramesh/.gstack/projects/matterhornso-theautonomousorg/abhinavramesh-main-design-20260428-221324.md`** — full design doc (3 office-hours review iterations + eng review + design review). Contains every locked decision.
3. **`/Users/abhinavramesh/.gstack/projects/matterhornso-theautonomousorg/abhinavramesh-main-eng-review-test-plan-20260428-225921.md`** — test plan, consumed by `/qa`
4. **`/Users/abhinavramesh/.gstack/projects/matterhornso-theautonomousorg/designs/vault-page-20260429/wireframe.html`** — approved visual reference; all CSS variables already lifted into `app/globals.css`
5. **`CLAUDE.md`** (this directory) — engineering conventions
6. **`DESIGN.md`** (this directory) — design tokens, anti-patterns
7. **`TODO.md`** (this directory) — pick highest-priority unblocked P0

---

## Day 1 — critical path (DO THIS FIRST)

The V1 demo depends on at least ONE working revoke adapter. Before writing any other V1 feature code, **verify the upstream APIs** with curl:

### 1. Anthropic admin keys API (UNVERIFIED — confirm shape)

```bash
# Get a real key id from your Anthropic dashboard, then:
curl -X DELETE 'https://api.anthropic.com/v1/organizations/api_keys/{KEY_ID}' \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -i
```

Decision tree:
- **2xx response** → Anthropic adapter works as written. Update `lib/adapters/anthropic.ts` if endpoint shape differs from the placeholder.
- **404** → Endpoint URL wrong. Check Anthropic admin API docs at https://docs.anthropic.com (admin keys section). Update adapter.
- **401/403 (auth)** → User key cannot self-revoke. Need separate Admin API key (sk-ant-admin-*). Update adapter to accept admin token instead.
- **No public docs / endpoint doesn't exist** → Anthropic adapter falls back to `not_supported`. Move Anthropic to V1.1 deep-link only.

### 2. Resend API (documented public)

```bash
curl -X DELETE 'https://api.resend.com/api-keys/{KEY_ID}' \
  -H "Authorization: Bearer $RESEND_API_KEY" \
  -i
```

Almost certainly works (documented at https://resend.com/docs/api-reference/api-keys/delete-api-key). Confirm 404-when-already-revoked behavior.

### 3. OpenAI revoke API (likely dashboard-only)

```bash
curl -X DELETE 'https://api.openai.com/v1/api_keys/{KEY_ID}' \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -i
```

Expected to fail. If it does, OpenAI is V1.1 deep-link only. Don't write the adapter.

### 4. Apollo partner program

Apply at https://www.apollo.io/partners. **3-7 business day approval.** Submit Day 1, regardless of revoke API status. Apollo revoke is V1.1 anyway.

### Contingency rules

- **Both Anthropic + Resend work:** V1 demo path is intact. Build as designed.
- **Only Resend works:** V1 demo uses Resend as the kill target. Anthropic moves to V1.1.
- **Neither works:** V1 ships as "vault + receipts + deep-link to billing portals." Still demoable, less magical. Pivot copy on the landing page.

After spike, update `TODO.md` Day-1 entry with results + close the contingency item.

---

## V1 build sequence (10-15 days realistic)

Per the design doc, post-spike:

### Week 1: Foundation
1. **Day 1:** spike (above) + brand name lock (currently "Vault." placeholder — see `app/layout.tsx`, `package.json` `name`, copy throughout)
2. **Days 2-3:** wire real Clerk + Supabase
   - Provision Supabase project (or reuse theautonomousorg's)
   - Apply `migrations/0001_init.sql`
   - Set up Clerk-Supabase JWT mapping per https://supabase.com/docs/guides/auth/third-party/clerk
   - Apply `migrations/0002_rls.sql` ONLY after JWT mapping is verified
3. **Day 4:** Add-key form (`/vault/add` page) with auto-detect from `lib/parser/services.ts` (TBD)
4. **Day 5:** real `/api/vault` CRUD; vault page reads from DB instead of mocks (delete `MOCK_ROWS` once 1+ real key exists)

### Week 2: Receipts pipeline
6. **Day 6:** Gmail OAuth (post-login flow per design doc auth section)
7. **Day 7:** Railway worker scaffolding (`scripts/worker.ts` — TBD)
8. **Days 8-9:** 4-stage receipt parser (`lib/parser/`):
   - Stage 1 sender allowlist filter (free)
   - Stage 2 subject regex filter (free)
   - Stage 3 Haiku classifier (cheap)
   - Stage 4 Sonnet structured extractor (regular cost)
9. **Day 10:** vault page now shows real `last_30d $` and renewal data

### Week 3: Kill switch + demo
10. **Day 11:** real adapter wiring in `app/api/kill/[entryId]/route.ts` (currently 501 stub)
11. **Day 12:** kill-state UI per state machine (5 states) — most CSS already in `app/vault/components.tsx`
12. **Day 13:** post-kill email via Resend with deep-link
13. **Day 14:** record the 30-second demo

### Week 4: Launch
14. **Day 15:** tweet + DM 10 founder friends

---

## What's already scaffolded (don't rebuild)

- Next.js 16 app structure with Tailwind 4
- Clerk auth (sign-in/sign-up routes, middleware)
- Vault page with mock data rendering the approved wireframe
- Schema migrations + RLS policies
- AES-256-GCM encryption helpers (`lib/crypto.ts`)
- Postgres client with atomic state transitions (`lib/db.ts`)
- Adapter contract + 2 placeholder adapters (Anthropic, Resend)
- `withRevokeRetries` shared helper
- `/api/health` endpoint
- `/api/kill/[entryId]` stub (returns 501 in real-DB mode, 200 with mock data)
- DESIGN.md, CLAUDE.md, README.md, TODO.md

---

## What's NOT scaffolded (V1 work)

- Add-key form + `/api/vault` CRUD
- Gmail OAuth + worker
- Receipt parser pipeline (lib/parser/)
- LLM eval suite (50 hand-labeled receipts)
- E2E tests (Playwright)
- Vault DESIGN.md sync to settings page
- Daily digest email (V1.1)
- Stripe billing (Day 60+)

---

## Cross-app conventions

- **Auth:** Clerk only. Shared instance with theautonomous.org and memory.theautonomous.org for SSO. No Auth0.
- **Database:** Vault uses schema `vault` in the same Supabase project as theautonomous.org. Don't touch `public.*` tables.
- **Design system:** `DESIGN.md` inherits from theautonomous.org parent. Read before any UI change.
- **Secrets:** never commit `.env.local`, never log full key plaintext. AES-256-GCM at rest with `ENCRYPTION_KEY`.
- **Node version:** pinned to 22 LTS in `package.json` engines. Don't run on 25 (Clerk SSR + experimental webstorage interaction).

## When in doubt

- Read the design doc — every locked decision has a rationale.
- Read the eng review section — 10 issues + decisions, all binding.
- Read the design review section — 7 visual decisions + the wireframe.
- If task spans products (auth, shared infra), read `/Users/abhinavramesh/theautonomousorg/CONTEXT.md`.

# TODO — TA Vault

> Source of truth for Vault V1 build sequence. Read `HANDOFF.md` first. Mark items complete with `[x]` + date.

**Last updated:** 2026-04-29

Section legend:
- 🔴 **P0:** blocking V1 demo
- 🟠 **P1:** V1 must-haves (vault works end-to-end)
- 🟡 **P2:** V1 polish, V1.1 prep
- 🔵 **Backlog:** V1.1 / V2

---

## 🔴 P0 — Day 1 critical path (BEFORE any V1 feature code)

### Action items requiring user (Abhinav)

- [ ] **Decide brand name.** Currently "Vault." everywhere as placeholder. Candidates: Vault, Keychain, Receipt, Killswitch, Founder Vault. *Affects:* `package.json` `name`, `app/layout.tsx`, copy throughout, domain (keys.theautonomous.org assumed but reservable).
- [ ] **Provision Supabase.** Either reuse theautonomousorg's project (preferred, gives shared `vault` schema) or new project. Need: `DATABASE_URL`. Apply `migrations/0001_init.sql`. Apply `migrations/0002_rls.sql` AFTER Clerk JWT mapping is wired.
- [ ] **Set up Clerk JWT mapping in Supabase.** Per https://supabase.com/docs/guides/auth/third-party/clerk. Verify by querying with a real Clerk session token.
- [ ] **Generate `ENCRYPTION_KEY`** with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Store in `.env.local` and Railway production.
- [ ] **Create Google Cloud OAuth credentials** (web application type). Authorized redirect URI: `https://keys.theautonomous.org/api/gmail/callback`. Required scope: `https://www.googleapis.com/auth/gmail.readonly`.
- [ ] **Get Anthropic Admin API key** if Day-1 spike (below) reveals user keys cannot self-revoke.
- [ ] **Apply to Apollo partner program** at https://www.apollo.io/partners (3-7d turnaround, blocks V1.1 Apollo revoke).
- [ ] **Provision Railway service** for `keys.theautonomous.org`. Point to `apps/vault` build (see `railway.json`). Add DNS CNAME at registrar.

### Spike + verification (coding agent can do once user provides keys)

- [ ] **Anthropic revoke API spike.** `curl -X DELETE 'https://api.anthropic.com/v1/organizations/api_keys/{ID}' -H "x-api-key: $ANTHROPIC_API_KEY"`. Document response in this file. Update `lib/adapters/anthropic.ts` if endpoint shape differs.
- [ ] **Resend revoke API spike.** `curl -X DELETE 'https://api.resend.com/api-keys/{ID}' -H "Authorization: Bearer $RESEND_API_KEY"`. Confirm 404-when-already-revoked.
- [ ] **OpenAI revoke API spike** (expected to fail — confirms V1.1 deep-link only).
- [ ] **Run contingency decision.** Update HANDOFF.md "Day 1" section with spike results.

---

## 🟠 P1 — V1 build sequence (10-15 days)

### Week 1: Foundation

- [ ] **Wire real Clerk** — replace dev `pk_test_` keys with `pk_live_` once Clerk app is configured for keys.theautonomous.org
- [ ] **`/vault/add` page** — paste-key form, auto-detect service from prefix (sk- → OpenAI/Anthropic, re_ → Resend, etc), label field, manual billing fallback fields
- [ ] **`/api/vault` CRUD** — POST (create + encrypt), GET (list, joined with receipts via `lib/db.ts` `listVaultEntriesForUser`), PUT (update label/manual billing), DELETE
- [ ] **Service catalog** — `lib/parser/services.ts` (TBD): canonical id ↔ display name ↔ key prefix patterns ↔ Gmail sender domains. Mirror `theautonomousorg/src/lib/suggested-platforms.ts`.
- [ ] **Switch vault page from mocks to real DB.** Delete `MOCK_ROWS` once user has 1+ real key. Mocks remain as fallback when DATABASE_URL is unset (dev mode).

### Week 2: Receipts pipeline

- [ ] **Gmail OAuth flow.** Use `googleapis` `OAuth2Client`. Store tokens encrypted via `lib/crypto.ts`. On `invalid_grant`, set `gmail_connection_status = 'expired'` + show reconnect banner.
- [ ] **`/api/gmail/callback`** — exchange code for tokens, persist to `vault.users`.
- [ ] **`/api/gmail/disconnect`** — revoke at Google + clear local tokens.
- [ ] **Worker (`scripts/worker.ts`)** — Railway worker, polls every 4 hours, fetches Gmail messages with `format=metadata` (memory efficiency).
- [ ] **Receipt parser pipeline** (`lib/parser/`):
  - Stage 1: sender allowlist filter (sender domain ∈ services.ts allowlist)
  - Stage 2: subject regex filter (`/(receipt|invoice|payment|charged|subscription|renewal)/i`)
  - Stage 3: Haiku classifier (yes/no + service name) — 3-4x cheaper than Sonnet
  - Stage 4: Sonnet structured extractor (service, amount, currency, charged_at, billing_cycle, confidence)
  - Canonicalize service name against `services.ts` aliases
  - Insert via `INSERT ... ON CONFLICT DO NOTHING` per `UNIQUE(user_id, source_email_id)` index
- [ ] **Reconnect-Gmail banner** in vault page when `gmail_connection_status = 'expired'`

### Week 3: Kill switch + demo

- [ ] **Real `/api/kill/[entryId]`** — replace 501 stub. Load entry from DB, decrypt key, dispatch to adapter via `getRevokeAdapter()`, transition state per state machine.
- [ ] **Anthropic adapter wiring** — assuming spike passed; otherwise mark `not_supported`.
- [ ] **Resend adapter wiring** — same.
- [ ] **Post-kill email via Resend** — send deep-link to billing portal. Template TBD; use brand DM Sans + gold for the CTA.
- [ ] **Cancel-pending watcher** — worker checks for charge-stopped after 7 days (yellow row flag) and 35 days (cancelled state).
- [ ] **Kill-failed retry button** — already in `app/vault/components.tsx`; verify against real adapter.
- [ ] **Record demo screen recording.** 30-second clip showing dormant Apollo row → Kill click → row collapse → email arrives.

### Week 4: Launch

- [ ] **Tweet the demo.** Pin it.
- [ ] **DM 10 founder friends** with sign-up link.
- [ ] **Monitor for first feedback.** Iterate on what actually breaks.

---

## 🟡 P2 — Polish + V1.1 prep

- [ ] **LLM eval suite.** 50 hand-labeled receipts from your own Gmail (PII redacted). Pass: 49/50 service correct, 50/50 amount + currency. CI fails PR on regression.
- [ ] **Haiku classifier eval.** 100 messages (30 receipts + 70 marketing). Pass: 95% recall, 90% specificity.
- [ ] **E2E Playwright tests.** Critical paths from test plan: signup → connect Gmail → see vault; add manual key → kill → row collapses; kill fails → retry succeeds; reconnect Gmail.
- [ ] **Unit tests.** `lib/crypto.ts` round-trip, `withRevokeRetries` retry behavior, atomic state transitions, parser stages.
- [ ] **RLS isolation tests.** User A cannot see/kill/insert as User B at every endpoint.
- [ ] **Mobile responsive.** Stacked cards <768px per design review.
- [ ] **Empty state UX.** Already in `app/vault/page.tsx` — verify against first-time user without Gmail.
- [ ] **Accessibility pass.** Touch targets ≥44px, keyboard nav, ARIA labels per design review.

---

## 🔵 Backlog (V1.1 / V2)

- [ ] OpenAI revoke adapter (Day-1 spike pending)
- [ ] Apollo revoke adapter (partner program approval pending)
- [ ] Stripe revoke adapter (user's own Stripe account)
- [ ] Daily digest email (Mon-Fri 9am)
- [ ] Settings page (per-service preferences)
- [ ] Pricing page + Stripe checkout (Day 60+)
- [ ] Sentry observability for OAuth + revoke + parser failures
- [ ] Per-user passphrase-derived encryption (V2 — replaces shared `ENCRYPTION_KEY`)
- [ ] Audit log table + break-glass key rotation
- [ ] Anthropic Tier 2 rate limit upgrade (when ~20 paying users)
- [ ] Browser-automation cancel flows for non-API services (V2)
- [ ] Per-key API-call usage detection (V2; charged-recently is the V1 proxy)
- [ ] Refund handling in receipt parser
- [ ] Calendar integration — auto-trigger pre-charge brief
- [ ] Real service logos (V1 uses letterforms per design review)
- [ ] Light mode (V2; dark-first by design)
- [ ] Mobile native app (PWA only in V1)
- [ ] Bulk-kill (select multiple → kill all)
- [ ] Cancelled section toggle on vault page

---

## Recently completed (for context)

- 2026-04-29 — Scaffolded V1 app: Next.js 16 + Clerk + Tailwind 4, vault page rendering wireframe, schema migrations, encryption helpers, adapter contract, 2 placeholder adapters, `/api/health`, `/api/kill` stub, all docs.
- 2026-04-28 — Office hours → eng review → design review pipeline. 7 office-hours decisions + 10 eng decisions + 7 design decisions all locked.

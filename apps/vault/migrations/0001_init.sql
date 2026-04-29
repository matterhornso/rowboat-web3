-- Vault schema — V1
-- Apply with: psql $DATABASE_URL < migrations/0001_init.sql
-- Or via: npm run migrate
--
-- Conventions:
-- - Schema: vault (separate from theautonomousorg's public schema)
-- - All user-scoped tables include user_id with RLS policies (see 0002)
-- - Encryption: AES-256-GCM with shared ENCRYPTION_KEY (V1); per-user keys in V2
-- - Timestamps: TIMESTAMPTZ in UTC, default now()

CREATE SCHEMA IF NOT EXISTS vault;

-- ─── State ENUM for vault entries ────────────────────────────
DO $$ BEGIN
  CREATE TYPE vault.entry_state AS ENUM (
    'active',
    'kill-requested',
    'key-revoked',
    'kill-failed',
    'subscription-cancel-pending',
    'cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ─── Users (Clerk-linked) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS vault.users (
  id              TEXT PRIMARY KEY,                  -- Clerk userId
  email           TEXT NOT NULL,
  primary_currency CHAR(3) NOT NULL DEFAULT 'USD',
  gmail_connection_status TEXT NOT NULL DEFAULT 'disconnected'
    CHECK (gmail_connection_status IN ('connected', 'expired', 'disconnected')),
  gmail_refresh_token_ciphertext BYTEA,
  gmail_refresh_token_iv BYTEA,
  gmail_refresh_token_tag BYTEA,
  last_sync_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Vault entries (the secrets) ─────────────────────────────
CREATE TABLE IF NOT EXISTS vault.vault_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         TEXT NOT NULL REFERENCES vault.users(id) ON DELETE CASCADE,
  service         TEXT NOT NULL,                      -- canonical id ('openai', 'anthropic', 'apollo', etc.)
  service_label   TEXT NOT NULL,                      -- display name ('OpenAI', 'Apollo.io')
  label           TEXT,                               -- user-supplied label
  key_ciphertext  BYTEA NOT NULL,                     -- AES-256-GCM
  key_iv          BYTEA NOT NULL,                     -- 12 bytes
  key_authtag     BYTEA NOT NULL,                     -- 16 bytes
  key_mask        TEXT NOT NULL,                      -- 'sk-...M3aB' for display
  state           vault.entry_state NOT NULL DEFAULT 'active',
  currency        CHAR(3) NOT NULL DEFAULT 'USD',
  manual_billing_amount_cents INTEGER,                -- only set when no Gmail receipts found
  manual_billing_cycle TEXT,                          -- 'monthly', 'annual', 'usage'
  manual_next_renewal DATE,                           -- user-supplied if no receipts
  last_used       TIMESTAMPTZ,                        -- when this app last used the key (V1.1)
  last_charged_at TIMESTAMPTZ,                        -- last charge_at from receipts (denormalized)
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  killed_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS vault_entries_user_state_idx
  ON vault.vault_entries (user_id, state);

-- ─── Receipts (parsed from Gmail) ────────────────────────────
CREATE TABLE IF NOT EXISTS vault.receipts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           TEXT NOT NULL REFERENCES vault.users(id) ON DELETE CASCADE,
  service           TEXT NOT NULL,                    -- canonical service id
  amount_cents      INTEGER NOT NULL,                 -- can be negative (refunds in V1.1)
  currency          CHAR(3) NOT NULL DEFAULT 'USD',
  charged_at        TIMESTAMPTZ NOT NULL,
  source_email_id   TEXT NOT NULL,                    -- Gmail message ID
  parser_confidence REAL NOT NULL,                    -- 0.0-1.0 from Sonnet extractor
  raw_subject       TEXT,                             -- audit trail
  parser_model      TEXT NOT NULL DEFAULT 'sonnet-4',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Idempotent insert guarantee (Issue 2 from eng review)
CREATE UNIQUE INDEX IF NOT EXISTS receipts_user_email_idx
  ON vault.receipts (user_id, source_email_id);

CREATE INDEX IF NOT EXISTS receipts_user_charged_idx
  ON vault.receipts (user_id, charged_at DESC);

-- ─── Service links (vault_entry ↔ receipts) ─────────────────
CREATE TABLE IF NOT EXISTS vault.service_links (
  vault_entry_id  UUID NOT NULL REFERENCES vault.vault_entries(id) ON DELETE CASCADE,
  receipt_id      UUID NOT NULL REFERENCES vault.receipts(id) ON DELETE CASCADE,
  matched_via     TEXT NOT NULL,                      -- 'auto-canonical', 'auto-confirmed', 'manual'
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (vault_entry_id, receipt_id)
);

CREATE INDEX IF NOT EXISTS service_links_vault_entry_idx
  ON vault.service_links (vault_entry_id);

-- ─── Revoke logs (audit trail of every revoke attempt) ──────
CREATE TABLE IF NOT EXISTS vault.revoke_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vault_entry_id  UUID NOT NULL REFERENCES vault.vault_entries(id) ON DELETE CASCADE,
  attempted_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  status          TEXT NOT NULL CHECK (status IN ('revoked', 'already_revoked', 'failed', 'not_supported')),
  error_code      TEXT,
  error_message   TEXT,
  retry_count     INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS revoke_logs_vault_entry_idx
  ON vault.revoke_logs (vault_entry_id, attempted_at DESC);

-- ─── updated_at trigger ──────────────────────────────────────
CREATE OR REPLACE FUNCTION vault.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_updated_at ON vault.users;
CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON vault.users
  FOR EACH ROW EXECUTE FUNCTION vault.set_updated_at();

DROP TRIGGER IF EXISTS vault_entries_updated_at ON vault.vault_entries;
CREATE TRIGGER vault_entries_updated_at
  BEFORE UPDATE ON vault.vault_entries
  FOR EACH ROW EXECUTE FUNCTION vault.set_updated_at();

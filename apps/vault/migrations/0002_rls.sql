-- Row-Level Security policies (Issue 3 from eng review)
--
-- Setup requires Supabase ↔ Clerk JWT mapping configured:
--   https://supabase.com/docs/guides/auth/third-party/clerk
--
-- Once configured, Supabase reads the Clerk userId from the JWT 'sub' claim
-- via auth.jwt()->>'sub' and policies filter every row.
--
-- THIS WILL FAIL TO ENFORCE if Clerk JWT mapping is not yet wired.
-- Apply 0001_init.sql first; apply this only after the JWT mapping is verified.

ALTER TABLE vault.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault.vault_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault.receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault.service_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault.revoke_logs ENABLE ROW LEVEL SECURITY;

-- Users see only their own profile row
CREATE POLICY users_self_only ON vault.users
  FOR ALL USING (id = auth.jwt()->>'sub')
  WITH CHECK (id = auth.jwt()->>'sub');

-- Vault entries: same-user only
CREATE POLICY vault_entries_self_only ON vault.vault_entries
  FOR ALL USING (user_id = auth.jwt()->>'sub')
  WITH CHECK (user_id = auth.jwt()->>'sub');

-- Receipts: same-user only
CREATE POLICY receipts_self_only ON vault.receipts
  FOR ALL USING (user_id = auth.jwt()->>'sub')
  WITH CHECK (user_id = auth.jwt()->>'sub');

-- Service links: filter via the parent vault entry's user_id
CREATE POLICY service_links_self_only ON vault.service_links
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM vault.vault_entries v
      WHERE v.id = vault_entry_id
        AND v.user_id = auth.jwt()->>'sub'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM vault.vault_entries v
      WHERE v.id = vault_entry_id
        AND v.user_id = auth.jwt()->>'sub'
    )
  );

-- Revoke logs: same as service_links
CREATE POLICY revoke_logs_self_only ON vault.revoke_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM vault.vault_entries v
      WHERE v.id = vault_entry_id
        AND v.user_id = auth.jwt()->>'sub'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM vault.vault_entries v
      WHERE v.id = vault_entry_id
        AND v.user_id = auth.jwt()->>'sub'
    )
  );

/**
 * Postgres client + DAL helpers.
 *
 * Singleton client (lazy-init) per the eng review Code Quality issue.
 * For V1, queries are written but the page falls back to mocks when
 * DATABASE_URL is unset.
 */
import postgres from 'postgres';
import type { VaultEntryWithBilling, EntryState } from './types';

let _sql: postgres.Sql | null = null;

function sql(): postgres.Sql {
  if (_sql) return _sql;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set');
  }
  // Detect Supabase pooler — disable prepared statements per Supabase docs
  const isPooler =
    url.includes(':6543') || url.includes('pooler.supabase.com');
  _sql = postgres(url, {
    max: 10,
    idle_timeout: 20,
    ssl: 'require',
    prepare: !isPooler,
    // Map snake_case columns to camelCase fields
    transform: postgres.camel,
  });
  return _sql;
}

/**
 * Atomic state transition for the kill flow (eng review Issue 4).
 *
 *   UPDATE vault_entries
 *   SET state = $newState
 *   WHERE id = $id AND user_id = $userId AND state = $expectedState
 *   RETURNING *
 *
 * If no row returned, the transition lost the race — caller should treat
 * as silent success (the winning request will complete the kill).
 */
export async function transitionState(args: {
  id: string;
  userId: string;
  expected: EntryState;
  next: EntryState;
}): Promise<{ won: boolean; row?: unknown }> {
  const db = sql();
  const rows = await db`
    UPDATE vault.vault_entries
    SET state = ${args.next}
    WHERE id = ${args.id}
      AND user_id = ${args.userId}
      AND state = ${args.expected}
    RETURNING *
  `;
  return { won: rows.length === 1, row: rows[0] };
}

/**
 * List vault entries with denormalized billing data for the vault page.
 *
 * Joins receipts to compute last_30d total per service. Falls back to
 * manual_billing_amount_cents when no receipts exist.
 *
 * Throws if DATABASE_URL is unset — caller should fall back to mocks.
 */
export async function listVaultEntriesForUser(
  userId: string,
): Promise<VaultEntryWithBilling[]> {
  const db = sql();
  const rows = await db<
    Array<{
      id: string;
      service: string;
      serviceLabel: string;
      label: string | null;
      keyMask: string;
      state: EntryState;
      currency: string;
      manualBillingAmountCents: number | null;
      manualBillingCycle: string | null;
      manualNextRenewal: Date | null;
      lastUsed: Date | null;
      lastChargedAt: Date | null;
      createdAt: Date;
      killedAt: Date | null;
      last30dCents: number;
      nextRenewal: Date | null;
    }>
  >`
    WITH receipts_30d AS (
      SELECT
        service,
        SUM(amount_cents)::int AS last_30d_cents,
        MAX(charged_at) AS last_charged_at
      FROM vault.receipts
      WHERE user_id = ${userId}
        AND charged_at >= now() - interval '30 days'
      GROUP BY service
    ),
    next_renewal AS (
      -- Heuristic: next renewal = last_charged + 30d for monthly services.
      -- Real implementation should use billing_cycle from extracted receipts.
      SELECT
        service,
        MAX(charged_at) + interval '30 days' AS next_charge
      FROM vault.receipts
      WHERE user_id = ${userId}
      GROUP BY service
    )
    SELECT
      ve.id,
      ve.service,
      ve.service_label,
      ve.label,
      ve.key_mask,
      ve.state,
      ve.currency,
      ve.manual_billing_amount_cents,
      ve.manual_billing_cycle,
      ve.manual_next_renewal,
      ve.last_used,
      ve.last_charged_at,
      ve.created_at,
      ve.killed_at,
      COALESCE(r30.last_30d_cents, 0) AS last_30d_cents,
      COALESCE(nr.next_charge, ve.manual_next_renewal::timestamptz) AS next_renewal
    FROM vault.vault_entries ve
    LEFT JOIN receipts_30d r30 ON r30.service = ve.service
    LEFT JOIN next_renewal nr ON nr.service = ve.service
    WHERE ve.user_id = ${userId}
      AND ve.state NOT IN ('cancelled')
    ORDER BY ve.created_at DESC
  `;

  const now = new Date();
  return rows.map((r) => {
    const daysToRenewal = r.nextRenewal
      ? Math.ceil((r.nextRenewal.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
      : null;
    const last30dCents =
      r.last30dCents > 0
        ? r.last30dCents
        : (r.manualBillingAmountCents ?? 0);
    const daysSinceLastCharge = r.lastChargedAt
      ? Math.floor(
          (now.getTime() - r.lastChargedAt.getTime()) / (24 * 60 * 60 * 1000),
        )
      : undefined;
    return {
      id: r.id,
      service: r.service,
      serviceLabel: r.serviceLabel,
      label: r.label,
      keyMask: r.keyMask,
      state: r.state,
      currency: r.currency,
      manualBillingAmountCents: r.manualBillingAmountCents,
      manualBillingCycle:
        (r.manualBillingCycle as 'monthly' | 'annual' | 'usage' | null) ?? null,
      manualNextRenewal: r.manualNextRenewal,
      lastUsed: r.lastUsed,
      lastChargedAt: r.lastChargedAt,
      createdAt: r.createdAt,
      killedAt: r.killedAt,
      last30dCents,
      nextRenewal: r.nextRenewal,
      daysToRenewal,
      chargedRecently: last30dCents > 0,
      daysSinceLastCharge,
    };
  });
}

/** Health check — single round-trip query. */
export async function pingDb(): Promise<boolean> {
  try {
    const db = sql();
    const r = await db`SELECT 1 as ok`;
    return r[0]?.ok === 1;
  } catch {
    return false;
  }
}

/** Close the connection pool. Call on shutdown for clean exit. */
export async function closeDb(): Promise<void> {
  if (_sql) {
    await _sql.end();
    _sql = null;
  }
}

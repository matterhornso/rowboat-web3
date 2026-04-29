/**
 * POST /api/kill/[entryId]
 *
 * The kill endpoint. Per eng review:
 * - Atomic state transition (Issue 4): UPDATE WHERE state = 'active' RETURNING
 * - Idempotent revoke adapter (Issue 5): withRevokeRetries handles all paths
 * - Failed-revoke transitions to kill-failed state (Issue 6)
 * - RLS policies (Issue 3) enforce user_id at DB level
 *
 * V1 stub: returns 200 if mock mode, real flow when DB + adapters are wired.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { transitionState } from '@/lib/db';
import { getRevokeAdapter } from '@/lib/adapters/registry';
import { decrypt } from '@/lib/crypto';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ entryId: string }> },
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { entryId } = await params;

  // Mock mode: succeed immediately so the wireframe demo works pre-DB.
  if (!process.env.DATABASE_URL || entryId.startsWith('mock-')) {
    await new Promise((r) => setTimeout(r, 600)); // Simulate the 800ms revoke delay
    return NextResponse.json({ status: 'revoked', mock: true });
  }

  // active → kill-requested (atomic; loses race silently)
  const t1 = await transitionState({
    id: entryId,
    userId,
    expected: 'active',
    next: 'kill-requested',
  });
  if (!t1.won) {
    // Already in flight — caller will see updated state on next poll
    return NextResponse.json({ status: 'in-progress' });
  }

  // TODO V1: load entry from DB to get service + ciphertext
  // const entry = await getVaultEntry(entryId, userId);
  // const adapter = getRevokeAdapter(entry.service);
  // if (!adapter) { return NextResponse.json({ status: 'not_supported' }, { status: 200 }); }
  // const plaintext = decrypt({ ciphertext: entry.keyCiphertext, iv: entry.keyIv, authTag: entry.keyAuthtag });
  // const result = await adapter.revoke(plaintext, { userId, vaultEntryId: entryId });
  // ...
  // For now, the V1 stub just rolls back to active — the real adapter wiring
  // happens after the Day-1 spike confirms revoke API shapes.
  await transitionState({
    id: entryId,
    userId,
    expected: 'kill-requested',
    next: 'active',
  });

  return NextResponse.json(
    {
      error: 'kill flow not yet wired — Day-1 spike pending',
      hint: 'See apps/vault/HANDOFF.md § "Day 1 critical path"',
    },
    { status: 501 },
  );
}

// Mark unused imports as referenced for future wiring
void getRevokeAdapter;
void decrypt;

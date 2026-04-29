// Shared types for the vault app. Mirrors migrations/0001_init.sql.

export type EntryState =
  | 'active'
  | 'kill-requested'
  | 'key-revoked'
  | 'kill-failed'
  | 'subscription-cancel-pending'
  | 'cancelled';

export type RevokeStatus =
  | 'revoked'
  | 'already_revoked'
  | 'failed'
  | 'not_supported';

export type GmailConnectionStatus = 'connected' | 'expired' | 'disconnected';

export type CanonicalService =
  | 'openai'
  | 'anthropic'
  | 'apollo'
  | 'resend'
  | 'stripe'
  | 'google'
  | string; // permissive: service catalog grows over time

export interface User {
  id: string; // Clerk userId
  email: string;
  primaryCurrency: string;
  gmailConnectionStatus: GmailConnectionStatus;
  lastSyncAt: Date | null;
  createdAt: Date;
}

export interface VaultEntry {
  id: string;
  userId: string;
  service: CanonicalService;
  serviceLabel: string;
  label: string | null;
  keyMask: string; // 'sk-...M3aB' for display only
  state: EntryState;
  currency: string;
  manualBillingAmountCents: number | null;
  manualBillingCycle: 'monthly' | 'annual' | 'usage' | null;
  manualNextRenewal: Date | null;
  lastUsed: Date | null;
  lastChargedAt: Date | null;
  createdAt: Date;
  killedAt: Date | null;
}

export interface VaultEntryWithBilling extends Omit<VaultEntry, 'userId'> {
  // Augmented for the vault page render. Computed by the DB query.
  last30dCents: number;
  nextRenewal: Date | null;
  daysToRenewal: number | null;
  chargedRecently: boolean;
  daysSinceLastCharge?: number;
}

export interface Receipt {
  id: string;
  userId: string;
  service: CanonicalService;
  amountCents: number;
  currency: string;
  chargedAt: Date;
  sourceEmailId: string;
  parserConfidence: number;
  rawSubject: string | null;
  parserModel: string;
  createdAt: Date;
}

export interface RevokeLog {
  id: string;
  vaultEntryId: string;
  attemptedAt: Date;
  status: RevokeStatus;
  errorCode: string | null;
  errorMessage: string | null;
  retryCount: number;
}

// Adapter contract from eng review Issue 5
export interface RevokeContext {
  userId: string;
  vaultEntryId: string;
}

export type RevokeResult =
  | { status: 'revoked' }
  | { status: 'already_revoked' }
  | {
      status: 'failed';
      code: string;
      retryable: boolean;
      message: string;
    }
  | { status: 'not_supported' };

export interface RevokeAdapter {
  serviceId: CanonicalService;
  revoke(keyPlaintext: string, ctx: RevokeContext): Promise<RevokeResult>;
}

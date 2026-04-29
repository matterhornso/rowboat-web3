import { auth, currentUser } from '@clerk/nextjs/server';
import { UserButton } from '@clerk/nextjs';
import { redirect } from 'next/navigation';
import type { VaultEntryWithBilling } from '@/lib/types';
import { listVaultEntriesForUser } from '@/lib/db';
import {
  VaultRow,
  KillModalShell,
  FailedRevokeBanner,
} from './components';

export const dynamic = 'force-dynamic';

// Mock data for V1-pre-DB. Once /lib/db.ts is wired against Supabase the
// page renders live data; until then this matches the approved wireframe
// so the screen recording can be shot against this build.
const MOCK_ROWS: VaultEntryWithBilling[] = [
  {
    id: 'mock-1',
    service: 'openai',
    serviceLabel: 'OpenAI',
    keyMask: 'sk-...M3aB',
    state: 'active',
    last30dCents: 48700,
    currency: 'USD',
    nextRenewal: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    daysToRenewal: 7,
    chargedRecently: true,
  },
  {
    id: 'mock-2',
    service: 'anthropic',
    serviceLabel: 'Anthropic',
    keyMask: 'sk-ant-...kZ7d',
    state: 'active',
    last30dCents: 12400,
    currency: 'USD',
    nextRenewal: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    daysToRenewal: 30,
    chargedRecently: true,
  },
  {
    id: 'mock-3',
    service: 'apollo',
    serviceLabel: 'Apollo.io',
    keyMask: 'ap-...9xQs',
    state: 'active',
    last30dCents: 0,
    currency: 'USD',
    nextRenewal: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    daysToRenewal: 14,
    chargedRecently: false,
    daysSinceLastCharge: 47,
  },
  {
    id: 'mock-4',
    service: 'resend',
    serviceLabel: 'Resend',
    keyMask: 're-...nT4w',
    state: 'active',
    last30dCents: 1900,
    currency: 'USD',
    nextRenewal: new Date(Date.now() + 33 * 24 * 60 * 60 * 1000),
    daysToRenewal: 33,
    chargedRecently: true,
  },
  {
    id: 'mock-5',
    service: 'stripe',
    serviceLabel: 'Stripe',
    keyMask: 'sk_live_...fJ2k',
    state: 'active',
    last30dCents: 0,
    currency: 'USD',
    nextRenewal: null,
    daysToRenewal: null,
    chargedRecently: true,
  },
];

export default async function VaultPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const user = await currentUser();

  // Switch to live data once DB is wired. For now mocks render the
  // approved wireframe pixel-for-pixel.
  let rows: VaultEntryWithBilling[];
  try {
    rows = await listVaultEntriesForUser(userId);
    if (rows.length === 0 && process.env.VAULT_USE_MOCKS !== 'false') {
      rows = MOCK_ROWS;
    }
  } catch {
    rows = MOCK_ROWS;
  }

  const last30dTotal = rows.reduce((sum, r) => sum + r.last30dCents, 0);
  const upcoming14d = rows
    .filter((r) => r.daysToRenewal !== null && r.daysToRenewal <= 14)
    .reduce((sum, r) => {
      // Use last 30d as a proxy for upcoming charge if no explicit billing amount
      return sum + r.last30dCents;
    }, 0);
  const dormantCount = rows.filter((r) => !r.chargedRecently).length;
  const activeCount = rows.length;

  const userInitial =
    user?.firstName?.[0] ?? user?.emailAddresses[0]?.emailAddress?.[0] ?? 'A';

  return (
    <>
      {/* Top nav */}
      <div className="flex justify-between items-center px-6 sm:px-16 py-5 border-b border-[rgba(255,255,255,0.08)]">
        <div className="serif text-[22px] tracking-tight">
          Vault<span className="text-[#D4A853]">.</span>
        </div>
        <div className="flex items-center gap-6">
          <a
            href="/settings"
            className="text-[#A09A8D] text-[13px] uppercase tracking-wider font-medium hover:text-[#FAFAF8]"
          >
            Settings
          </a>
          <a
            href="/docs"
            className="text-[#A09A8D] text-[13px] uppercase tracking-wider font-medium hover:text-[#FAFAF8]"
          >
            Docs
          </a>
          <UserButton afterSignOutUrl="/sign-in" appearance={{ elements: { avatarBox: 'h-8 w-8' } }} />
          {/* Fallback initial avatar (only shown if Clerk fails to mount) */}
          <div className="hidden h-8 w-8 rounded-full grid place-items-center font-semibold text-[13px] text-[#0A0A0B] bg-gradient-to-br from-[#D4A853] to-[#B8902C]">
            {userInitial.toUpperCase()}
          </div>
        </div>
      </div>

      {/* Main shell */}
      <div className="max-w-[1180px] mx-auto px-6 sm:px-16 py-10 sm:py-16">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-6 mb-12 sm:mb-14">
          <div>
            <h1 className="serif text-5xl sm:text-6xl leading-none mb-3">Your Vault.</h1>
            <p className="text-[#A09A8D] text-[17px] max-w-[640px]">
              Every API key in one place. Know what they cost. Kill them in one click.
            </p>
          </div>
          <a
            href="/vault/add"
            className="bg-[#D4A853] text-[#0A0A0B] px-5 py-3 text-sm font-semibold rounded-md inline-flex items-center gap-2 hover:bg-[#B8902C] whitespace-nowrap self-start sm:self-auto"
          >
            <span className="text-lg leading-none">+</span> Add key
          </a>
        </div>

        {/* Failed-revoke banner placeholder — surfaced by client component when state ∈ kill-failed */}
        <FailedRevokeBanner />

        {/* Summary stats */}
        <div className="flex flex-wrap gap-x-12 gap-y-6 mb-6 pb-5 border-b border-[rgba(255,255,255,0.08)]">
          <Stat label="Last 30 days" value={fmtCents(last30dTotal)} />
          <Stat label="Upcoming charges (14d)" value={fmtCents(upcoming14d)} />
          <Stat
            label="Dormant keys"
            value={`${dormantCount} of ${activeCount}`}
            flag={dormantCount > 0}
          />
          <Stat label="Active services" value={activeCount.toString()} />
        </div>

        {/* Table */}
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <Th width="22%">Service</Th>
              <Th width="22%">Key</Th>
              <Th width="22%">Last 30d $</Th>
              <Th width="18%">Next renewal</Th>
              <Th width="16%" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <VaultRow key={row.id} row={row} />
            ))}
          </tbody>
        </table>

        {rows.length === 0 && <EmptyVault />}
      </div>

      {/* Kill modal — controlled by client state in the row component */}
      <KillModalShell />
    </>
  );
}

function Stat({
  label,
  value,
  flag = false,
}: {
  label: string;
  value: string;
  flag?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] tracking-[0.08em] uppercase text-[#5A554B] font-medium">
        {label}
      </span>
      <span
        className={`text-xl tnum ${flag ? 'text-[#B33A3A]' : 'text-[#FAFAF8]'}`}
      >
        {value}
      </span>
    </div>
  );
}

function Th({
  children,
  width,
}: {
  children?: React.ReactNode;
  width: string;
}) {
  return (
    <th
      style={{ width }}
      className="py-3.5 px-4 text-left text-[11px] tracking-[0.08em] uppercase text-[#5A554B] font-medium border-b border-[rgba(255,255,255,0.08)] last:text-right"
    >
      {children}
    </th>
  );
}

function EmptyVault() {
  return (
    <div className="text-center py-20">
      <h2 className="serif text-4xl mb-3">Setting up your vault.</h2>
      <p className="text-[#A09A8D] max-w-md mx-auto mb-8">
        We&apos;re scanning your Gmail for receipts. First sync takes ~4 hours.
        Add a key manually below to get started.
      </p>
      <a
        href="/vault/add"
        className="bg-[#D4A853] text-[#0A0A0B] px-6 py-3 text-sm font-semibold rounded-md inline-flex items-center gap-2 hover:bg-[#B8902C]"
      >
        <span className="text-lg leading-none">+</span> Add your first key
      </a>
    </div>
  );
}

function fmtCents(cents: number, currency = 'USD') {
  const dollars = cents / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(dollars);
}

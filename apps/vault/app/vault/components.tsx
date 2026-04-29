'use client';

import { useState, useTransition } from 'react';
import type { VaultEntryWithBilling } from '@/lib/types';

export function VaultRow({ row }: { row: VaultEntryWithBilling }) {
  const dormant = !row.chargedRecently;
  const [state, setState] = useState(row.state);
  const [isPending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleKill = () => {
    setConfirmOpen(false);
    startTransition(async () => {
      setState('kill-requested');
      try {
        const res = await fetch(`/api/kill/${row.id}`, { method: 'POST' });
        if (!res.ok) {
          setState('kill-failed');
          return;
        }
        setState('key-revoked');
      } catch {
        setState('kill-failed');
      }
    });
  };

  if (state === 'key-revoked' || state === 'cancelled') {
    return (
      <tr className="border-b border-[rgba(255,255,255,0.08)]">
        <td colSpan={5} className="py-3 px-4 text-[#5A554B] text-sm">
          <span className="line-through mr-2">{row.serviceLabel}</span>
          <span className="text-[#2D5A3D]">✓ revoked</span>
          <span className="ml-3 text-[#A09A8D]">— cancel link sent to your email</span>
        </td>
      </tr>
    );
  }

  return (
    <>
      <tr
        className={`border-b transition-colors ${
          dormant
            ? 'bg-[rgba(179,58,58,0.04)] border-[rgba(179,58,58,0.18)] hover:bg-[rgba(179,58,58,0.10)]'
            : 'border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.015)]'
        } ${isPending || state === 'kill-requested' ? 'opacity-60' : ''} ${
          state === 'kill-failed' ? 'border-l-[3px] border-l-[#B33A3A]' : ''
        }`}
      >
        <td className="py-5 px-4 align-middle">
          <div className="flex items-center gap-3.5">
            <div
              className={`w-8 h-8 rounded-md grid place-items-center text-xs font-bold tracking-tight ${
                dormant
                  ? 'bg-[rgba(179,58,58,0.15)] text-[#B33A3A]'
                  : 'bg-[#1A1918] text-[#A09A8D]'
              }`}
            >
              {row.serviceLabel
                .replace(/[^a-zA-Z]/g, '')
                .substring(0, 2)
                .toUpperCase()}
            </div>
            <span className="text-[15px] font-medium">{row.serviceLabel}</span>
          </div>
        </td>
        <td className="py-5 px-4 align-middle">
          <span className="mono text-[13px] text-[#A09A8D] tracking-tight">
            {row.keyMask}
          </span>
        </td>
        <td className="py-5 px-4 align-middle">
          {dormant ? (
            <span className="text-[11px] tracking-[0.10em] uppercase font-semibold text-[#B33A3A] inline-flex items-center gap-2">
              <span
                className="w-1.5 h-1.5 bg-[#B33A3A] rounded-full"
                style={{
                  animation: 'pulse-dot 1.6s ease-in-out infinite',
                  boxShadow: '0 0 0 4px rgba(179, 58, 58, 0.2)',
                }}
                aria-label={`No charge in ${row.daysSinceLastCharge ?? 30}+ days, subscription dormant`}
              />
              No charge {row.daysSinceLastCharge ?? 30}d+
            </span>
          ) : (
            <span className="tnum text-[15px]">
              {fmtCents(row.last30dCents, row.currency)}
            </span>
          )}
        </td>
        <td className="py-5 px-4 align-middle">
          {row.nextRenewal && row.daysToRenewal !== null ? (
            <div>
              <div className="tnum text-sm">
                {row.nextRenewal.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </div>
              <div
                className={`text-[11px] mt-0.5 tracking-wide ${
                  row.daysToRenewal <= 14 ? 'text-[#D4A853]' : 'text-[#A09A8D]'
                }`}
              >
                in {row.daysToRenewal} days
              </div>
            </div>
          ) : (
            <span className="text-sm text-[#5A554B]">on usage</span>
          )}
        </td>
        <td className="py-5 px-4 align-middle text-right">
          {state === 'kill-failed' ? (
            <button
              onClick={() => setConfirmOpen(true)}
              className="px-[18px] py-[9px] text-[13px] font-semibold tracking-wide rounded-md border border-[#B33A3A] text-[#B33A3A] hover:bg-[#B33A3A] hover:text-[#FAFAF8] transition-colors"
              aria-label={`Retry kill ${row.serviceLabel}`}
            >
              Retry Kill
            </button>
          ) : (
            <button
              onClick={() => setConfirmOpen(true)}
              disabled={isPending || state !== 'active'}
              className={`px-[18px] py-[9px] text-[13px] font-semibold tracking-wide rounded-md transition-colors ${
                dormant
                  ? 'bg-[#B33A3A] text-[#FAFAF8] hover:bg-[#C24545] border border-[#B33A3A]'
                  : 'border border-[rgba(255,255,255,0.16)] text-[#FAFAF8] hover:bg-[rgba(255,255,255,0.04)]'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              aria-label={`Revoke ${row.serviceLabel} API key`}
            >
              {state === 'kill-requested' ? 'Killing…' : 'Kill'}
            </button>
          )}
        </td>
      </tr>

      {confirmOpen && (
        <KillConfirmModal
          row={row}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={handleKill}
        />
      )}
    </>
  );
}

function KillConfirmModal({
  row,
  onCancel,
  onConfirm,
}: {
  row: VaultEntryWithBilling;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <tr>
      <td colSpan={5} className="p-0 m-0">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="kill-modal-title"
          className="fixed inset-0 bg-black/60 z-50 grid place-items-center px-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) onCancel();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onCancel();
          }}
        >
          <div className="bg-[#14130F] border border-[rgba(255,255,255,0.16)] rounded-xl p-9 w-full max-w-[480px]">
            <h2 id="kill-modal-title" className="serif text-2xl mb-2 tracking-tight">
              Kill {row.serviceLabel}?
            </h2>
            <p className="text-sm text-[#A09A8D] mb-6">
              This revokes your API key with {row.serviceLabel}. After it&apos;s
              revoked, you&apos;ll get a one-click link to cancel the underlying
              subscription in {row.serviceLabel}&apos;s billing portal.
            </p>
            <div className="bg-[#0A0A0B] border border-[rgba(255,255,255,0.08)] rounded-md p-4 mb-7 mono text-[13px]">
              <div className="flex justify-between py-1">
                <span className="text-[#5A554B]">Key</span>
                <span>{row.keyMask}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#5A554B]">Last 30d</span>
                <span>{fmtCents(row.last30dCents, row.currency)}</span>
              </div>
              {row.nextRenewal && row.daysToRenewal !== null && (
                <div className="flex justify-between py-1">
                  <span className="text-[#5A554B]">Renews</span>
                  <span>
                    {row.nextRenewal.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}{' '}
                    (in {row.daysToRenewal} days)
                  </span>
                </div>
              )}
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={onCancel}
                className="px-5 py-2.5 text-[13px] font-medium rounded-md border border-[rgba(255,255,255,0.16)] text-[#FAFAF8] hover:bg-[rgba(255,255,255,0.04)]"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                className="px-5 py-2.5 text-[13px] font-semibold tracking-wide rounded-md border border-[#B33A3A] bg-[#B33A3A] text-[#FAFAF8] hover:bg-[#C24545]"
              >
                Yes, revoke key
              </button>
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
}

export function KillModalShell() {
  // Currently unused — modal is rendered inline by VaultRow.
  // Reserved for V1.1 page-level kill confirmations (e.g. bulk kill).
  return null;
}

export function FailedRevokeBanner() {
  // V1.1: surface here when ANY row is in kill-failed state.
  // For V1 the indicator is row-level only.
  return null;
}

function fmtCents(cents: number, currency = 'USD') {
  const dollars = cents / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(dollars);
}

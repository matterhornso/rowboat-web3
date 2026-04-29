/**
 * Resend API key revoke adapter.
 *
 * Endpoint per https://resend.com/docs/api-reference/api-keys/delete-api-key:
 *   DELETE https://api.resend.com/api-keys/:id
 *   Authorization: Bearer re_*
 *
 * Resend supports per-key revocation via their public API. Spike still
 * required to confirm 404-when-already-revoked behavior.
 */
import type { RevokeAdapter, RevokeResult, RevokeContext } from '../types';
import { withRevokeRetries } from './withRetries';

const RESEND_API = 'https://api.resend.com/api-keys';

export const resendAdapter: RevokeAdapter = {
  serviceId: 'resend',
  async revoke(keyPlaintext: string, _ctx: RevokeContext): Promise<RevokeResult> {
    if (process.env.ENABLE_KILL_RESEND !== 'true') {
      return { status: 'not_supported' };
    }

    return withRevokeRetries(async () => {
      const keyId = extractKeyId(keyPlaintext);
      if (!keyId) {
        return { status: 400, ok: false };
      }
      const res = await fetch(`${RESEND_API}/${keyId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${keyPlaintext}`,
        },
      });
      return { status: res.status, ok: res.ok };
    });
  },
};

/**
 * Resend keys are formatted: re_{teamId}_{secret}
 * The keyId for the DELETE endpoint is typically the teamId portion.
 *
 * !!! Verify with Day-1 spike. !!!
 */
function extractKeyId(plaintext: string): string | null {
  const match = plaintext.match(/^re_([A-Za-z0-9]+)_/);
  return match?.[1] ?? null;
}

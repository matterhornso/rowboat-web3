/**
 * Anthropic admin keys revoke adapter.
 *
 * !!! UNVERIFIED !!! — Day-1 spike must confirm endpoint shape and auth
 * before relying on this in V1 demo. See design doc § "Day-1 critical-path
 * spike" and Tech Stack table.
 *
 * If the spike reveals the endpoint is dashboard-only (not public API),
 * this adapter throws not_supported and the UI falls back to deep-link.
 */
import type { RevokeAdapter, RevokeResult, RevokeContext } from '../types';
import { withRevokeRetries } from './withRetries';

const ANTHROPIC_ADMIN_API = 'https://api.anthropic.com/v1/organizations/api_keys';

export const anthropicAdapter: RevokeAdapter = {
  serviceId: 'anthropic',
  async revoke(keyPlaintext: string, _ctx: RevokeContext): Promise<RevokeResult> {
    if (process.env.ENABLE_KILL_ANTHROPIC !== 'true') {
      return { status: 'not_supported' };
    }

    // Day-1 spike: verify the actual endpoint format. Placeholder logic:
    // Some Anthropic admin API patterns require an Admin API key (separate
    // from regular sk-ant- keys). We pass the user's own key to start; the
    // spike will tell us whether Anthropic accepts that or requires admin auth.
    return withRevokeRetries(async () => {
      const keyId = extractKeyId(keyPlaintext);
      if (!keyId) {
        return { status: 400, ok: false };
      }
      const res = await fetch(`${ANTHROPIC_ADMIN_API}/${keyId}`, {
        method: 'DELETE',
        headers: {
          'x-api-key': keyPlaintext,
          'anthropic-version': '2023-06-01',
        },
      });
      return { status: res.status, ok: res.ok };
    });
  },
};

/**
 * Extract the key id from an Anthropic key string.
 * sk-ant-{type}-{id}-{secret} → id
 *
 * !!! Verify format with Day-1 spike. !!!
 */
function extractKeyId(plaintext: string): string | null {
  const match = plaintext.match(/^sk-ant-[a-z]+-([A-Za-z0-9_]+)/);
  return match?.[1] ?? null;
}

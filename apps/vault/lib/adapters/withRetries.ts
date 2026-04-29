/**
 * Shared retry/error-mapping helper for revoke adapters.
 *
 * From eng review Issue 5: DRY the boilerplate now while there are 2 adapters,
 * not 5. Each adapter becomes a thin wrapper around this helper.
 */
import type { RevokeResult } from '../types';

interface WithRetriesOptions {
  /** Max retry attempts on 5xx/network errors. Default: 3. */
  maxAttempts?: number;
  /** Base delay in ms for exponential backoff. Default: 200. */
  baseDelayMs?: number;
  /** Max delay between retries. Default: 5000. */
  maxDelayMs?: number;
}

interface AdapterResponse {
  status: number;
  ok: boolean;
}

export async function withRevokeRetries(
  call: () => Promise<AdapterResponse>,
  opts: WithRetriesOptions = {},
): Promise<RevokeResult> {
  const maxAttempts = opts.maxAttempts ?? 3;
  const baseDelay = opts.baseDelayMs ?? 200;
  const maxDelay = opts.maxDelayMs ?? 5000;

  let lastError = '';
  let lastCode = 'UNKNOWN';

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      const delay = Math.min(
        baseDelay * Math.pow(2, attempt - 1) + Math.random() * 100,
        maxDelay,
      );
      await new Promise((r) => setTimeout(r, delay));
    }

    try {
      const res = await call();

      // Success
      if (res.ok || res.status === 204) return { status: 'revoked' };

      // Already revoked — idempotent success
      if (res.status === 404) return { status: 'already_revoked' };

      // Auth failure — key was already invalid; treat as success
      if (res.status === 401 || res.status === 403) {
        return { status: 'already_revoked' };
      }

      // Rate limit — retry with backoff
      if (res.status === 429) {
        lastError = 'Rate limited';
        lastCode = 'RATE_LIMITED';
        continue;
      }

      // 5xx — transient, retry
      if (res.status >= 500 && res.status < 600) {
        lastError = `Upstream ${res.status}`;
        lastCode = `HTTP_${res.status}`;
        continue;
      }

      // 4xx other than 401/403/404/429 — non-retryable client error
      return {
        status: 'failed',
        code: `HTTP_${res.status}`,
        retryable: false,
        message: `Client error ${res.status}`,
      };
    } catch (err) {
      // Network error — retry
      lastError = err instanceof Error ? err.message : String(err);
      lastCode = 'NETWORK';
    }
  }

  return {
    status: 'failed',
    code: lastCode,
    retryable: true,
    message: `Exhausted ${maxAttempts} attempts. Last error: ${lastError}`,
  };
}

/**
 * Adapter registry. Lookup by canonical service id.
 *
 * V1: Anthropic + Resend (verified-public-API services per design doc).
 * V1.1: OpenAI (pending Day-1 spike), Apollo (pending partner program), Stripe.
 */
import type { RevokeAdapter, CanonicalService } from '../types';
import { anthropicAdapter } from './anthropic';
import { resendAdapter } from './resend';

const ADAPTERS: Record<string, RevokeAdapter> = {
  anthropic: anthropicAdapter,
  resend: resendAdapter,
};

export function getRevokeAdapter(
  service: CanonicalService,
): RevokeAdapter | null {
  return ADAPTERS[service] ?? null;
}

export function hasRevokeAdapter(service: CanonicalService): boolean {
  return service in ADAPTERS;
}

export function listSupportedServices(): CanonicalService[] {
  return Object.keys(ADAPTERS);
}

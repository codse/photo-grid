import { router } from 'expo-router';

/** Why the Lifetime paywall opened — drives hero copy + feature highlight. */
export type ProReason = 'people' | 'exports' | 'ads';

const REASONS = new Set<ProReason>(['people', 'exports', 'ads']);

export function coerceProReason(raw: unknown): ProReason | undefined {
  if (typeof raw !== 'string') return undefined;
  return REASONS.has(raw as ProReason) ? (raw as ProReason) : undefined;
}

/** Open Pro modal, optionally with a gated-feature reason. */
export function openProPaywall(reason?: ProReason) {
  if (reason) {
    router.push({ pathname: '/pro', params: { reason } });
    return;
  }
  router.push('/pro');
}

import AsyncStorage from '@/platform/storage';

const FORCE_FREE_KEY = 'passport-photo-print.dev.forceFreeAds';
const ADS_MUTED_UNTIL_KEY = 'passport-photo-print.ads.mutedUntil';
const EXPORT_COUNT_KEY = 'passport-photo-print.stats.exportCount';
const REVIEW_PROMPTED_KEY = 'passport-photo-print.review.promptedAt';

/** __DEV__ only — ignore Pro and show ads for testing. */
let forceFreeAdsMem: boolean | null = null;
let adsMutedUntilMem: number | null = null;

export async function loadForceFreeAds(): Promise<boolean> {
  if (!__DEV__) return false;
  if (forceFreeAdsMem != null) return forceFreeAdsMem;
  try {
    const v = await AsyncStorage.getItem(FORCE_FREE_KEY);
    forceFreeAdsMem = v === '1';
  } catch {
    forceFreeAdsMem = false;
  }
  return forceFreeAdsMem;
}

export async function setForceFreeAds(on: boolean): Promise<void> {
  if (!__DEV__) return;
  forceFreeAdsMem = on;
  try {
    await AsyncStorage.setItem(FORCE_FREE_KEY, on ? '1' : '0');
  } catch {
    // ignore
  }
}

export function getForceFreeAdsSync(): boolean {
  return __DEV__ && forceFreeAdsMem === true;
}

export async function getAdsMutedUntil(): Promise<number> {
  if (adsMutedUntilMem != null) return adsMutedUntilMem;
  try {
    const v = await AsyncStorage.getItem(ADS_MUTED_UNTIL_KEY);
    adsMutedUntilMem = v ? Number(v) || 0 : 0;
  } catch {
    adsMutedUntilMem = 0;
  }
  return adsMutedUntilMem;
}

export async function muteAdsForMs(ms: number): Promise<number> {
  const until = Date.now() + ms;
  adsMutedUntilMem = until;
  try {
    await AsyncStorage.setItem(ADS_MUTED_UNTIL_KEY, String(until));
  } catch {
    // ignore
  }
  return until;
}

export async function isAdsMutedNow(): Promise<boolean> {
  const until = await getAdsMutedUntil();
  return until > Date.now();
}

/** Rewarded “ads off” window — 1 hour. */
export const REWARDED_MUTE_MS = 60 * 60 * 1000;

export async function bumpExportCount(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(EXPORT_COUNT_KEY);
    const next = (raw ? Number(raw) || 0 : 0) + 1;
    await AsyncStorage.setItem(EXPORT_COUNT_KEY, String(next));
    return next;
  } catch {
    return 0;
  }
}

export async function getExportCount(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(EXPORT_COUNT_KEY);
    return raw ? Number(raw) || 0 : 0;
  } catch {
    return 0;
  }
}

export async function markReviewPrompted(): Promise<void> {
  try {
    await AsyncStorage.setItem(REVIEW_PROMPTED_KEY, String(Date.now()));
  } catch {
    // ignore
  }
}

export async function getReviewPromptedAt(): Promise<number> {
  try {
    const v = await AsyncStorage.getItem(REVIEW_PROMPTED_KEY);
    return v ? Number(v) || 0 : 0;
  } catch {
    return 0;
  }
}

/** Prompt after 2nd successful export, then at most once per 120 days. */
export async function shouldAskForReview(): Promise<boolean> {
  const count = await getExportCount();
  if (count < 2) return false;
  const last = await getReviewPromptedAt();
  if (!last) return true;
  return Date.now() - last > 120 * 24 * 60 * 60 * 1000;
}

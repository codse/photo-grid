import AsyncStorage from '@/platform/storage';
import {
  getForceFreeAdsSync,
  loadForceFreeAds,
} from '@/monetization/ads-prefs';
import { getCachedIsPro, isPro } from '@/monetization/purchases';

/** Free tier: hard caps that sell Lifetime Pro. */
export const FREE_EXPORTS_PER_DAY = 5;
export const FREE_MAX_PEOPLE = 2;

const DAILY_EXPORT_KEY = 'passport-photo-print.limits.dailyExports';

type DailyExportBlob = {
  /**
   * Local calendar day `YYYY-MM-DD` (device timezone).
   * Resets when the local date rolls — midnight, travel TZ change, or clock edit.
   * Soft freemium gate only; we don’t fight clock-back abuse for a lifetime IAP.
   */
  day: string;
  count: number;
};

/** Device-local calendar day — not UTC. */
function todayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

async function readDaily(): Promise<DailyExportBlob> {
  const day = todayKey();
  try {
    const raw = await AsyncStorage.getItem(DAILY_EXPORT_KEY);
    if (!raw) return { day, count: 0 };
    const parsed = JSON.parse(raw) as DailyExportBlob;
    if (!parsed || parsed.day !== day) return { day, count: 0 };
    return { day, count: Math.max(0, Number(parsed.count) || 0) };
  } catch {
    return { day, count: 0 };
  }
}

async function writeDaily(blob: DailyExportBlob): Promise<void> {
  try {
    await AsyncStorage.setItem(DAILY_EXPORT_KEY, JSON.stringify(blob));
  } catch {
    // ignore
  }
}

/** True when Lifetime is active and __DEV__ force-free is off. */
export async function hasEffectivePro(): Promise<boolean> {
  await loadForceFreeAds();
  if (getForceFreeAdsSync()) return false;
  try {
    return getCachedIsPro() || (await isPro());
  } catch {
    return false;
  }
}

export function hasEffectiveProSync(isProFlag: boolean, forceFree: boolean): boolean {
  if (forceFree) return false;
  return isProFlag;
}

export async function getDailyExportCount(): Promise<number> {
  return (await readDaily()).count;
}

export async function getRemainingFreeExportsToday(): Promise<number> {
  if (await hasEffectivePro()) return Number.POSITIVE_INFINITY;
  const used = await getDailyExportCount();
  return Math.max(0, FREE_EXPORTS_PER_DAY - used);
}

/** Whether free user can start another save/share today. */
export async function canExportNow(): Promise<boolean> {
  if (await hasEffectivePro()) return true;
  return (await getDailyExportCount()) < FREE_EXPORTS_PER_DAY;
}

/** Call after a successful save/share (not bookmark-only). */
export async function recordDailyExport(): Promise<number> {
  if (await hasEffectivePro()) {
    return (await readDaily()).count;
  }
  const cur = await readDaily();
  const next = { day: cur.day, count: cur.count + 1 };
  await writeDaily(next);
  return next.count;
}

export function canAddPersonCount(
  currentCount: number,
  effectivePro: boolean,
): boolean {
  if (effectivePro) return true;
  return currentCount < FREE_MAX_PEOPLE;
}

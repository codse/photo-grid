import AsyncStorage from '@/platform/storage';

const KEY = 'passport-photo-print.prefs.v1';
export const RECENT_CONFIG_MAX = 5;

export type ConfigSnapshot = {
  photoId: string;
  paperId: string;
};

export type StoredPrefs = {
  photoId: string;
  paperId: string;
  /** Configs that completed at least one export (MRU). */
  recentConfigs?: ConfigSnapshot[];
};

export function pushRecentConfig(
  list: ConfigSnapshot[],
  next: ConfigSnapshot,
  max = RECENT_CONFIG_MAX,
): ConfigSnapshot[] {
  const key = `${next.photoId}|${next.paperId}`;
  const rest = list.filter((c) => `${c.photoId}|${c.paperId}` !== key);
  return [next, ...rest].slice(0, max);
}

function sanitizeRecent(raw: unknown): ConfigSnapshot[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (c): c is ConfigSnapshot =>
      !!c &&
      typeof c === 'object' &&
      typeof (c as ConfigSnapshot).photoId === 'string' &&
      typeof (c as ConfigSnapshot).paperId === 'string',
  );
}

export async function loadPrefs(): Promise<StoredPrefs | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredPrefs;
    if (!parsed?.photoId || !parsed?.paperId) return null;
    return {
      photoId: parsed.photoId,
      paperId: parsed.paperId,
      recentConfigs: sanitizeRecent(parsed.recentConfigs).slice(
        0,
        RECENT_CONFIG_MAX,
      ),
    };
  } catch {
    return null;
  }
}

export async function savePrefs(prefs: {
  photoId: string;
  paperId: string;
  recentConfigs?: ConfigSnapshot[];
}): Promise<void> {
  try {
    await AsyncStorage.setItem(
      KEY,
      JSON.stringify({
        photoId: prefs.photoId,
        paperId: prefs.paperId,
        recentConfigs: (prefs.recentConfigs ?? []).slice(0, RECENT_CONFIG_MAX),
      } satisfies StoredPrefs),
    );
  } catch {
    // ignore
  }
}

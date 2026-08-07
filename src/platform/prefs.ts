import AsyncStorage from '@/platform/storage';
import type { ExportImageExt } from '@/core/export-name';
import { isExportDpi, type ExportDpi } from '@/core/units';

const KEY = 'passport-photo-print.prefs.v1';
export const SAVED_PRESET_MAX = 12;

type PackMode = 'exact' | 'fill';
type Orientation = 'auto' | 'portrait' | 'landscape';

/** Named print setup — size, paper, packing. Not a saved image. */
export type ConfigSnapshot = {
  id: string;
  name: string;
  photoId: string;
  paperId: string;
  packMode: PackMode;
  orientation: Orientation;
  gapMm: number;
  marginMm: number;
  cutGuides: boolean;
  savedAt: number;
};

export type StoredPrefs = {
  photoId: string;
  paperId: string;
  /** Default raster DPI for share / save. */
  exportDpi?: ExportDpi;
  /** Default image format on the Share screen. */
  exportFormat?: ExportImageExt;
  /** Default cut guides for new sheets. */
  cutGuides?: boolean;
  /** @deprecated migrated into savedPresets */
  recentConfigs?: unknown[];
  savedPresets?: ConfigSnapshot[];
};

export function newPresetId(): string {
  return `preset-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function configKey(c: Pick<ConfigSnapshot, 'photoId' | 'paperId' | 'packMode' | 'orientation' | 'gapMm' | 'marginMm' | 'cutGuides'>): string {
  return [
    c.photoId,
    c.paperId,
    c.packMode,
    c.orientation,
    c.gapMm,
    c.marginMm,
    c.cutGuides ? 1 : 0,
  ].join('|');
}

/** Upsert by identical settings (keeps name if replacing unnamed collision). */
export function upsertPreset(
  list: ConfigSnapshot[],
  next: ConfigSnapshot,
  max = SAVED_PRESET_MAX,
): ConfigSnapshot[] {
  const key = configKey(next);
  const rest = list.filter(
    (c) => c.id !== next.id && configKey(c) !== key,
  );
  return [next, ...rest].slice(0, max);
}

function isPackMode(v: unknown): v is PackMode {
  return v === 'exact' || v === 'fill';
}

function isOrientation(v: unknown): v is Orientation {
  return v === 'auto' || v === 'portrait' || v === 'landscape';
}

function isExportFormat(v: unknown): v is ExportImageExt {
  return v === 'png' || v === 'jpg';
}

function migrateOne(raw: unknown, index: number): ConfigSnapshot | null {
  if (!raw || typeof raw !== 'object') return null;
  const c = raw as Record<string, unknown>;
  if (typeof c.photoId !== 'string' || typeof c.paperId !== 'string') return null;

  const name =
    typeof c.name === 'string' && c.name.trim()
      ? c.name.trim().slice(0, 48)
      : `Preset ${index + 1}`;

  return {
    id: typeof c.id === 'string' && c.id ? c.id : newPresetId(),
    name,
    photoId: c.photoId,
    paperId: c.paperId,
    packMode: isPackMode(c.packMode) ? c.packMode : 'fill',
    orientation: isOrientation(c.orientation) ? c.orientation : 'auto',
    gapMm: typeof c.gapMm === 'number' ? c.gapMm : 2,
    marginMm: typeof c.marginMm === 'number' ? c.marginMm : 3,
    cutGuides: typeof c.cutGuides === 'boolean' ? c.cutGuides : true,
    savedAt: typeof c.savedAt === 'number' ? c.savedAt : Date.now() - index,
  };
}

function sanitizePresets(raw: unknown): ConfigSnapshot[] {
  if (!Array.isArray(raw)) return [];
  const out: ConfigSnapshot[] = [];
  for (let i = 0; i < raw.length; i++) {
    const item = migrateOne(raw[i], i);
    if (item) out.push(item);
  }
  return out.slice(0, SAVED_PRESET_MAX);
}

export async function loadPrefs(): Promise<StoredPrefs | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredPrefs;
    if (!parsed?.photoId || !parsed?.paperId) return null;

    const fromNew = sanitizePresets(parsed.savedPresets);
    const fromLegacy =
      fromNew.length === 0 ? sanitizePresets(parsed.recentConfigs) : [];

    return {
      photoId: parsed.photoId,
      paperId: parsed.paperId,
      exportDpi: isExportDpi(parsed.exportDpi) ? parsed.exportDpi : 300,
      exportFormat: isExportFormat(parsed.exportFormat)
        ? parsed.exportFormat
        : 'jpg',
      cutGuides:
        typeof parsed.cutGuides === 'boolean' ? parsed.cutGuides : true,
      savedPresets: fromNew.length > 0 ? fromNew : fromLegacy,
    };
  } catch {
    return null;
  }
}

export async function savePrefs(prefs: {
  photoId: string;
  paperId: string;
  exportDpi?: ExportDpi;
  exportFormat?: ExportImageExt;
  cutGuides?: boolean;
  savedPresets?: ConfigSnapshot[];
}): Promise<void> {
  try {
    await AsyncStorage.setItem(
      KEY,
      JSON.stringify({
        photoId: prefs.photoId,
        paperId: prefs.paperId,
        exportDpi: prefs.exportDpi ?? 300,
        exportFormat: prefs.exportFormat ?? 'jpg',
        cutGuides: prefs.cutGuides ?? true,
        savedPresets: (prefs.savedPresets ?? []).slice(0, SAVED_PRESET_MAX),
      } satisfies StoredPrefs),
    );
  } catch {
    // ignore
  }
}

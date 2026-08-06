import type { Subject } from '@/core/types';

const FALLBACK_BASE = 'passport-photo';

/** Strip path + extension → safe filesystem stem. */
export function stemFromFileName(name: string | null | undefined): string {
  if (!name?.trim()) return FALLBACK_BASE;
  let base = name.trim().replace(/\\/g, '/');
  const slash = base.lastIndexOf('/');
  if (slash >= 0) base = base.slice(slash + 1);
  base = base.replace(/\.[^.]+$/, '');
  base = base
    .normalize('NFKD')
    .replace(/[^\w.\-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '');
  return base.slice(0, 80) || FALLBACK_BASE;
}

/** Guess original name from a picker URI when fileName is missing (common on web). */
export function stemFromUri(uri: string | null | undefined): string {
  if (!uri) return FALLBACK_BASE;
  try {
    const path = decodeURIComponent(uri.split('?')[0] ?? uri);
    return stemFromFileName(path);
  } catch {
    return FALLBACK_BASE;
  }
}

/**
 * Download / share basename without extension.
 * e.g. `IMG_4521-35x45mm-print-photo`
 */
export function exportSheetBasename(subjects: Subject[]): string {
  const primary =
    subjects.find((s) => s.url && s.sourceName) ??
    subjects.find((s) => s.url) ??
    subjects[0];
  const stem = stemFromFileName(
    primary?.sourceName ?? stemFromUri(primary?.url),
  );
  const w = Math.round(primary?.widthMm ?? 35);
  const h = Math.round(primary?.heightMm ?? 45);
  return `${stem}-${w}x${h}mm-print-photo`;
}

export function exportSheetFileName(
  subjects: Subject[],
  ext: 'png' | 'pdf',
): string {
  return `${exportSheetBasename(subjects)}.${ext}`;
}

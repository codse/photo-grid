/** Shared with `src/i18n/index.ts` — keep lists in sync. */
export const SHOT_APP_LOCALES = [
  'en',
  'en-GB',
  'pt',
  'ne',
  'hi',
  'es',
  'fr',
] as const;

export type ShotAppLocale = (typeof SHOT_APP_LOCALES)[number];

/**
 * Map ASC / koubou / deep-link tags → in-app locale.
 * Unknown values → null (caller keeps current locale).
 */
export function coerceAppLocale(
  raw: string | null | undefined,
): ShotAppLocale | null {
  if (!raw) return null;
  const t = raw.trim();
  if (!t) return null;
  if ((SHOT_APP_LOCALES as readonly string[]).includes(t)) {
    return t as ShotAppLocale;
  }

  const lower = t.toLowerCase().replace(/_/g, '-');
  const map: Record<string, ShotAppLocale> = {
    en: 'en',
    'en-us': 'en',
    'en-gb': 'en-GB',
    es: 'es',
    'es-es': 'es',
    fr: 'fr',
    'fr-fr': 'fr',
    pt: 'pt',
    'pt-pt': 'pt',
    'pt-br': 'pt',
    hi: 'hi',
    ne: 'ne',
    np: 'ne',
  };
  return map[lower] ?? null;
}

export type ShotBootstrap = {
  /** Allowed in-app path without query (e.g. `/sheet`). */
  path: string | null;
  locale: ShotAppLocale | null;
};

/**
 * Parse `Documents/shot-route.txt` or a deep-link path+query.
 *
 * Accepted forms:
 * - `/sheet`
 * - `/sheet?lang=es` or `?locale=fr`
 * - multiline: `lang=es` then `/sheet`
 */
export function parseShotBootstrap(raw: string): ShotBootstrap {
  const text = raw.replace(/^\uFEFF/, '').trim();
  if (!text) return { path: null, locale: null };

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  let locale: ShotAppLocale | null = null;
  let pathLine: string | null = null;

  for (const line of lines) {
    const langEq = /^lang(?:uage)?\s*=\s*(.+)$/i.exec(line);
    const localeEq = /^locale\s*=\s*(.+)$/i.exec(line);
    if (langEq) {
      locale = coerceAppLocale(langEq[1]) ?? locale;
      continue;
    }
    if (localeEq) {
      locale = coerceAppLocale(localeEq[1]) ?? locale;
      continue;
    }
    if (line.startsWith('/')) {
      pathLine = line;
    }
  }

  if (!pathLine && lines.length === 1 && !lines[0]!.startsWith('/')) {
    locale = coerceAppLocale(lines[0]) ?? locale;
  }

  if (!pathLine) {
    return { path: null, locale };
  }

  const qIndex = pathLine.indexOf('?');
  let path = pathLine;
  let query = '';
  if (qIndex >= 0) {
    path = pathLine.slice(0, qIndex);
    query = pathLine.slice(qIndex + 1);
  }

  if (query) {
    const params = new URLSearchParams(query);
    locale =
      coerceAppLocale(params.get('lang')) ??
      coerceAppLocale(params.get('locale')) ??
      locale;
  }

  return { path: path || null, locale };
}

export function localeFromUrl(
  url: string | null | undefined,
): ShotAppLocale | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return (
      coerceAppLocale(parsed.searchParams.get('lang')) ??
      coerceAppLocale(parsed.searchParams.get('locale'))
    );
  } catch {
    const m =
      /[?&](?:lang|locale)=([^&#]+)/i.exec(url) ??
      /[?&](?:lang|locale)%3D([^&#]+)/i.exec(url);
    return m ? coerceAppLocale(decodeURIComponent(m[1]!)) : null;
  }
}

/** Path for router.replace from a deep link (strip scheme/host). */
export function pathFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    let path = parsed.pathname || '';
    // `passportphotoprint:///sheet` → `/sheet`
    // `passportphotoprint://sheet` → host `sheet`
    if ((!path || path === '/') && parsed.host && !parsed.host.includes('.')) {
      path = `/${parsed.host}`;
    }
    if (!path.startsWith('/')) path = `/${path}`;
    if (path === '/') return null;
    return path;
  } catch {
    const m = /:\/\/[^/]*(\/[^?]*)/.exec(url);
    return m?.[1] && m[1] !== '/' ? m[1] : null;
  }
}

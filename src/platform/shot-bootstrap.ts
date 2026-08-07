/**
 * CODSE shot / deep-link bootstrap — copy this module into new apps.
 *
 * Force appearance + locale for App Store / marketing captures without
 * tapping through Settings. Same contract for deep links and headless
 * `Documents/shot-route.txt` plants.
 *
 * Query / file keys (all optional):
 * - `lang` | `locale`  → app language
 * - `theme` | `appearance` → `light` | `dark` | `system`
 * - path               → in-app route (allowlisted by the host app)
 *
 * Host applies appearance via `Appearance.setColorScheme` (or your theme
 * store) — this file stays pure so it can be unit-tested / shared.
 *
 * Examples:
 *   {scheme}://sheet?lang=es&theme=dark
 *   shot-route.txt:
 *     lang=fr
 *     theme=light
 *     /export
 */

/** Per-app: keep in sync with i18n APP_LOCALES. */
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

export type ShotAppearance = 'light' | 'dark' | 'system';

export type ShotBootstrap = {
  /** Path without query (e.g. `/sheet`). */
  path: string | null;
  locale: ShotAppLocale | null;
  appearance: ShotAppearance | null;
};

/** Map ASC / koubou / deep-link tags → in-app locale. */
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

export function coerceAppearance(
  raw: string | null | undefined,
): ShotAppearance | null {
  if (!raw) return null;
  const t = raw.trim().toLowerCase();
  if (t === 'light' || t === 'dark' || t === 'system') return t;
  if (t === 'default' || t === 'auto') return 'system';
  return null;
}

function readParams(params: URLSearchParams): {
  locale: ShotAppLocale | null;
  appearance: ShotAppearance | null;
} {
  return {
    locale:
      coerceAppLocale(params.get('lang')) ??
      coerceAppLocale(params.get('locale')),
    appearance:
      coerceAppearance(params.get('theme')) ??
      coerceAppearance(params.get('appearance')),
  };
}

/**
 * Parse `Documents/shot-route.txt`.
 *
 * Forms:
 * - `/sheet`
 * - `/sheet?lang=es&theme=dark`
 * - multiline `lang=…` / `theme=…` then `/path`
 */
export function parseShotBootstrap(raw: string): ShotBootstrap {
  const text = raw.replace(/^\uFEFF/, '').trim();
  if (!text) return { path: null, locale: null, appearance: null };

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  let locale: ShotAppLocale | null = null;
  let appearance: ShotAppearance | null = null;
  let pathLine: string | null = null;

  for (const line of lines) {
    const langEq = /^lang(?:uage)?\s*=\s*(.+)$/i.exec(line);
    const localeEq = /^locale\s*=\s*(.+)$/i.exec(line);
    const themeEq = /^theme\s*=\s*(.+)$/i.exec(line);
    const appearanceEq = /^appearance\s*=\s*(.+)$/i.exec(line);
    if (langEq) {
      locale = coerceAppLocale(langEq[1]) ?? locale;
      continue;
    }
    if (localeEq) {
      locale = coerceAppLocale(localeEq[1]) ?? locale;
      continue;
    }
    if (themeEq) {
      appearance = coerceAppearance(themeEq[1]) ?? appearance;
      continue;
    }
    if (appearanceEq) {
      appearance = coerceAppearance(appearanceEq[1]) ?? appearance;
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
    return { path: null, locale, appearance };
  }

  const qIndex = pathLine.indexOf('?');
  let path = pathLine;
  let query = '';
  if (qIndex >= 0) {
    path = pathLine.slice(0, qIndex);
    query = pathLine.slice(qIndex + 1);
  }

  if (query) {
    const fromQ = readParams(new URLSearchParams(query));
    locale = fromQ.locale ?? locale;
    appearance = fromQ.appearance ?? appearance;
  }

  return { path: path || null, locale, appearance };
}

/** Full bootstrap from a deep-link URL. */
export function bootstrapFromUrl(
  url: string | null | undefined,
): ShotBootstrap {
  if (!url) return { path: null, locale: null, appearance: null };
  return {
    path: pathFromUrl(url),
    locale: localeFromUrl(url),
    appearance: appearanceFromUrl(url),
  };
}

export function localeFromUrl(
  url: string | null | undefined,
): ShotAppLocale | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return readParams(parsed.searchParams).locale;
  } catch {
    const m =
      /[?&](?:lang|locale)=([^&#]+)/i.exec(url) ??
      /[?&](?:lang|locale)%3D([^&#]+)/i.exec(url);
    return m ? coerceAppLocale(decodeURIComponent(m[1]!)) : null;
  }
}

export function appearanceFromUrl(
  url: string | null | undefined,
): ShotAppearance | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return readParams(parsed.searchParams).appearance;
  } catch {
    const m =
      /[?&](?:theme|appearance)=([^&#]+)/i.exec(url) ??
      /[?&](?:theme|appearance)%3D([^&#]+)/i.exec(url);
    return m ? coerceAppearance(decodeURIComponent(m[1]!)) : null;
  }
}

/** Path for router.replace from a deep link (strip scheme/host). */
export function pathFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    let path = parsed.pathname || '';
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

/** Query string value from a deep link (handles host-as-path URLs). */
export function queryParamFromUrl(
  url: string | null | undefined,
  key: string,
): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const direct = parsed.searchParams.get(key);
    if (direct) return direct;
  } catch {
    // fall through
  }
  const re = new RegExp(`[?&]${key}=([^&#]+)`, 'i');
  const m = re.exec(url);
  return m ? decodeURIComponent(m[1]!) : null;
}

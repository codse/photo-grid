import { useCallback, useEffect, useState } from 'react';
import { I18nManager } from 'react-native';
import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next, setDefaults, useTranslation } from 'react-i18next';
import AsyncStorage from '@/platform/storage';

import en from './locales/en.json';
import enGB from './locales/en-GB.json';
import pt from './locales/pt.json';
import ne from './locales/ne.json';
import hi from './locales/hi.json';
import es from './locales/es.json';
import fr from './locales/fr.json';

// Must run at import time — before any useTranslation(). Default true suspends
// forever if initI18n hasn't finished (release blank screen).
setDefaults({ useSuspense: false });

export const APP_LOCALES = ['en', 'en-GB', 'pt', 'ne', 'hi', 'es', 'fr'] as const;
export type AppLocale = (typeof APP_LOCALES)[number];

const STORAGE_KEY = 'passport-photo-print.locale';

const resources = {
  en: { translation: en },
  'en-GB': { translation: enGB },
  pt: { translation: pt },
  ne: { translation: ne },
  hi: { translation: hi },
  es: { translation: es },
  fr: { translation: fr },
} as const;

/** Push latest locale JSON into the singleton (HMR leaves old keys otherwise). */
function syncResourceBundles() {
  for (const [lng, bundle] of Object.entries(resources)) {
    i18n.addResourceBundle(lng, 'translation', bundle.translation, true, true);
  }
  // Force react-i18next subscribers to re-read (addResourceBundle alone won't).
  if (i18n.isInitialized && i18n.language) {
    void i18n.changeLanguage(i18n.language);
  }
}

// Metro HMR of this module / JSON: refresh without full app relaunch.
if (i18n.isInitialized) {
  syncResourceBundles();
}

function resolveDeviceLocale(): AppLocale {
  const tag = Localization.getLocales()[0]?.languageTag ?? 'en';
  const lang = Localization.getLocales()[0]?.languageCode ?? 'en';
  if (tag.startsWith('en-GB') || tag === 'en-GB') return 'en-GB';
  if (APP_LOCALES.includes(tag as AppLocale)) return tag as AppLocale;
  if (lang === 'pt') return 'pt';
  if (lang === 'ne') return 'ne';
  if (lang === 'hi') return 'hi';
  if (lang === 'es') return 'es';
  if (lang === 'fr') return 'fr';
  if (lang === 'en') return 'en';
  return 'en';
}

let initDone: Promise<void> | null = null;

export async function initI18n(opts?: {
  prefer?: AppLocale | null;
}): Promise<void> {
  const run = async () => {
    let lng: AppLocale = resolveDeviceLocale();
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored && APP_LOCALES.includes(stored as AppLocale)) {
        lng = stored as AppLocale;
      }
    } catch {
      // keep device
    }

    if (opts?.prefer && APP_LOCALES.includes(opts.prefer)) {
      lng = opts.prefer;
    }

    if (!i18n.isInitialized) {
      await i18n.use(initReactI18next).init({
        resources,
        lng,
        fallbackLng: 'en',
        compatibilityJSON: 'v4',
        interpolation: { escapeValue: false },
        // Default true → RootLayout useTranslation suspends before initI18n
        // effects run → permanent blank screen in release (DEV often warm via HMR).
        react: { useSuspense: false },
      });
    } else {
      syncResourceBundles();
      await i18n.changeLanguage(lng);
    }

    if (opts?.prefer && APP_LOCALES.includes(opts.prefer)) {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, opts.prefer);
      } catch {
        // non-fatal
      }
    }

    // None of v1 locales are RTL.
    if (I18nManager.isRTL) {
      I18nManager.allowRTL(false);
      I18nManager.forceRTL(false);
    }
  };

  // Shot / deep-link can re-apply prefer after first init.
  if (opts?.prefer && initDone) {
    await run();
    return;
  }

  // HMR may re-import locale JSON while the singleton is already live.
  if (initDone) {
    syncResourceBundles();
    return initDone;
  }
  initDone = run();
  return initDone;
}

export function getLocaleLabel(code: AppLocale): string {
  return i18n.t(`locales.${code}`);
}

export async function setAppLocale(code: AppLocale): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, code);
  await i18n.changeLanguage(code);
}

export function useAppLocale() {
  const { i18n: instance } = useTranslation();
  const [locale, setLocaleState] = useState<AppLocale>(
    (instance.language as AppLocale) || 'en',
  );

  useEffect(() => {
    const onChange = (lng: string) => {
      if (APP_LOCALES.includes(lng as AppLocale)) {
        setLocaleState(lng as AppLocale);
      }
    };
    instance.on('languageChanged', onChange);
    onChange(instance.language);
    return () => {
      instance.off('languageChanged', onChange);
    };
  }, [instance]);

  const setLocale = useCallback(async (code: AppLocale) => {
    await setAppLocale(code);
    setLocaleState(code);
  }, []);

  return { locale, setLocale };
}

export { i18n };

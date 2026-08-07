import { useEffect, useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import { Appearance, Platform, View, useWindowDimensions } from 'react-native';
import * as Linking from 'expo-linking';
import { useTranslation } from 'react-i18next';
import { colors, fonts } from '@/ui/tokens';
import { useSession } from '@/state/session';
import { loadPrefs, savePrefs } from '@/platform/prefs';
import { initAds } from '@/monetization/ads';
import { configurePurchases } from '@/monetization/purchases';
import { initI18n, setAppLocale, type AppLocale } from '@/i18n';
import {
  appearanceFromUrl,
  localeFromUrl,
  parseShotBootstrap,
  pathFromUrl,
  type ShotAppearance,
} from '@/platform/shot-bootstrap';
import * as SplashScreen from 'expo-splash-screen';
import * as FileSystem from 'expo-file-system/legacy';
import {
  useFonts,
  Figtree_400Regular,
  Figtree_500Medium,
  Figtree_600SemiBold,
  Figtree_700Bold,
} from '@expo-google-fonts/figtree';
import {
  Fredoka_600SemiBold,
  Fredoka_700Bold,
} from '@expo-google-fonts/fredoka';
import {
  Commissioner_600SemiBold,
  Commissioner_700Bold,
  Commissioner_800ExtraBold,
} from '@expo-google-fonts/commissioner';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

/** Keep tabs under transparent camera modal (esp. web deep links). */
export const unstable_settings = {
  anchor: '(tabs)',
};

/** Headless sim capture: plant Documents/shot-route.txt then relaunch. */
const SHOT_ROUTE_FILE = 'shot-route.txt';

const ALLOWED_SHOT_ROUTES = new Set([
  '/(tabs)/index',
  '/size',
  '/saved',
  '/settings',
  '/(tabs)/settings',
  '/crop',
  '/sheet',
  '/export',
  '/camera',
  '/photo',
  '/pro',
]);

/** Host-side: shot bootstrap appearance → RN color scheme. */
function applyShotAppearance(appearance: ShotAppearance | null): void {
  if (!appearance) return;
  try {
    Appearance.setColorScheme(appearance === 'system' ? null : appearance);
  } catch {
    // ignore on unsupported platforms
  }
}

async function peekLaunchLocale(): Promise<AppLocale | null> {
  try {
    const url = await Linking.getInitialURL();
    const fromLink = localeFromUrl(url);
    if (fromLink) return fromLink as AppLocale;
    const appearance = appearanceFromUrl(url);
    if (appearance) applyShotAppearance(appearance);
  } catch {
    // ignore
  }

  if (Platform.OS === 'web') return null;
  const dir = FileSystem.documentDirectory;
  if (!dir) return null;
  try {
    const path = `${dir}${SHOT_ROUTE_FILE}`;
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists) return null;
    const raw = await FileSystem.readAsStringAsync(path);
    const boot = parseShotBootstrap(raw);
    if (boot.appearance) applyShotAppearance(boot.appearance);
    return boot.locale as AppLocale | null;
  } catch {
    return null;
  }
}

export default function RootLayout() {
  const router = useRouter();
  const { t } = useTranslation();
  const { width: winW } = useWindowDimensions();
  const [fontsLoaded] = useFonts({
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
    Figtree_700Bold,
    Fredoka_600SemiBold,
    Fredoka_700Bold,
    Commissioner_600SemiBold,
    Commissioner_700Bold,
    Commissioner_800ExtraBold,
  });
  const [i18nReady, setI18nReady] = useState(false);
  const [bootForced, setBootForced] = useState(false);

  const hydratePrefs = useSession((s) => s.hydratePrefs);
  const photoId = useSession((s) => s.photoId);
  const paperId = useSession((s) => s.paperId);
  const exportDpi = useSession((s) => s.exportDpi);
  const exportFormat = useSession((s) => s.exportFormat);
  const cutGuides = useSession((s) => s.cutGuides);
  const savedPresets = useSession((s) => s.savedPresets);
  const prefsHydrated = useSession((s) => s.prefsHydrated);

  useEffect(() => {
    void (async () => {
      const prefer = await peekLaunchLocale();
      await initI18n({ prefer });
      setI18nReady(true);
    })();
  }, []);

  useEffect(() => {
    void (async () => {
      const prefs = await loadPrefs();
      if (prefs) hydratePrefs(prefs);
      else hydratePrefs({ photoId, paperId });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    void configurePurchases().catch((e) => {
      if (__DEV__) console.warn('[RevenueCat] init failed', e);
    });
    void initAds().catch((e) => {
      if (__DEV__) console.warn('[AdMob] init failed', e);
    });
  }, []);

  useEffect(() => {
    if (!prefsHydrated) return;
    void savePrefs({
      photoId,
      paperId,
      exportDpi,
      exportFormat,
      cutGuides,
      savedPresets,
    });
  }, [
    photoId,
    paperId,
    exportDpi,
    exportFormat,
    cutGuides,
    savedPresets,
    prefsHydrated,
  ]);

  const bootReady = (fontsLoaded && i18nReady) || bootForced;

  useEffect(() => {
    const tmr = setTimeout(() => setBootForced(true), 4000);
    return () => clearTimeout(tmr);
  }, []);

  useEffect(() => {
    if (bootReady) void SplashScreen.hideAsync();
  }, [bootReady]);

  // Headless screenshot bootstrap: locale + route from Documents/shot-route.txt
  useEffect(() => {
    if (!bootReady || Platform.OS === 'web') return;
    const dir = FileSystem.documentDirectory;
    if (!dir) return;
    const path = `${dir}${SHOT_ROUTE_FILE}`;
    void (async () => {
      try {
        const info = await FileSystem.getInfoAsync(path);
        if (!info.exists) return;
        const raw = (await FileSystem.readAsStringAsync(path)).trim();
        await FileSystem.deleteAsync(path, { idempotent: true });
        const { path: route, locale, appearance } = parseShotBootstrap(raw);
        if (appearance) applyShotAppearance(appearance);
        if (locale) await setAppLocale(locale as AppLocale);
        if (route && ALLOWED_SHOT_ROUTES.has(route)) {
          router.replace(route as '/(tabs)/index');
        }
      } catch {
        // ignore — screenshot helper only
      }
    })();
  }, [bootReady, router]);

  // Deep link: passportphotoprint://sheet?lang=es
  useEffect(() => {
    if (!bootReady) return;

    const applyUrl = async (url: string | null) => {
      if (!url) return;
      const locale = localeFromUrl(url);
      const appearance = appearanceFromUrl(url);
      const route = pathFromUrl(url);
      if (appearance) applyShotAppearance(appearance);
      if (locale) await setAppLocale(locale as AppLocale);
      if (route && ALLOWED_SHOT_ROUTES.has(route)) {
        router.replace(route as '/(tabs)/index');
      }
    };

    void Linking.getInitialURL().then((url) => void applyUrl(url));
    const sub = Linking.addEventListener('url', ({ url }) => {
      void applyUrl(url);
    });
    return () => sub.remove();
  }, [bootReady, router]);

  if (!bootReady) return null;

  const isWeb = Platform.OS === 'web';
  // Phone chrome by default; widen for sheet sidebar / desktop layouts.
  const webMaxW = winW >= 900 ? 1080 : 540;
  const homeBack = t('common.home');

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: isWeb ? colors.line : colors.bg,
        ...(isWeb ? { alignItems: 'center' as const } : null),
      }}
    >
      <GestureHandlerRootView
        style={{
          flex: 1,
          width: '100%',
          maxWidth: isWeb ? webMaxW : undefined,
          backgroundColor: colors.bg,
        }}
      >
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShadowVisible: false,
            headerTintColor: colors.ink,
            headerStyle: { backgroundColor: colors.bg },
            contentStyle: { backgroundColor: colors.bg },
            headerTitleStyle: {
              fontFamily: fonts.semibold,
              fontWeight: '600',
            },
          }}
        >
          <Stack.Screen
            name="(tabs)"
            options={{ headerShown: false, title: homeBack }}
          />
          <Stack.Screen
            name="size"
            options={{
              title: t('nav.size'),
              headerBackTitle: homeBack,
            }}
          />
          <Stack.Screen
            name="saved"
            options={{
              title: t('saved.title'),
              headerBackTitle: homeBack,
            }}
          />
          <Stack.Screen
            name="photo"
            options={{
              title: t('nav.photo'),
              headerBackTitle: homeBack,
            }}
          />
          <Stack.Screen
            name="camera"
            options={
              isWeb
                ? {
                    title: '',
                    presentation: 'transparentModal',
                    animation: 'fade',
                    headerShown: false,
                    contentStyle: { backgroundColor: 'transparent' },
                  }
                : {
                    title: '',
                    presentation: 'fullScreenModal',
                    headerTransparent: true,
                    headerShadowVisible: false,
                    headerStyle: { backgroundColor: 'transparent' },
                    headerTintColor: '#fff',
                    contentStyle: { backgroundColor: '#000' },
                  }
            }
          />
          <Stack.Screen
            name="crop"
            options={{
              title: t('nav.crop'),
              headerBackTitle: homeBack,
            }}
          />
          <Stack.Screen
            name="person/[id]/crop"
            options={{
              title: t('nav.crop'),
              headerBackTitle: homeBack,
            }}
          />
          <Stack.Screen
            name="sheet"
            options={{ title: t('sheet.title') }}
          />
          <Stack.Screen
            name="export"
            options={{
              title: t('export.title'),
              headerBackTitle: t('sheet.title'),
            }}
          />
          <Stack.Screen
            name="pro"
            options={{
              title: t('pro.title'),
              presentation: Platform.OS === 'ios' ? 'modal' : 'card',
            }}
          />
        </Stack>
      </GestureHandlerRootView>
    </View>
  );
}

import { useEffect, useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import { Platform, View } from 'react-native';
import { colors, fonts } from '@/ui/tokens';
import { useSession } from '@/state/session';
import { loadPrefs, savePrefs } from '@/platform/prefs';
import { initAds } from '@/monetization/ads';
import { configurePurchases } from '@/monetization/purchases';
import { initI18n } from '@/i18n';
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

/** Headless sim capture: plant Documents/shot-route.txt then relaunch. */
const SHOT_ROUTE_FILE = 'shot-route.txt';

export default function RootLayout() {
  const router = useRouter();
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
    void initI18n().finally(() => setI18nReady(true));
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
    // Don't serialize ads behind RC — Pro gate reads cache later either way.
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
    const t = setTimeout(() => setBootForced(true), 4000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (bootReady) void SplashScreen.hideAsync();
  }, [bootReady]);

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
        if (!raw.startsWith('/')) return;
        // Allow only known in-app paths.
        const allowed = new Set([
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
        ]);
        if (!allowed.has(raw)) return;
        router.replace(raw as '/(tabs)/index');
      } catch {
        // ignore — screenshot helper only
      }
    })();
  }, [bootReady, router]);

  if (!bootReady) return null;

  const isWeb = Platform.OS === 'web';

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
          maxWidth: isWeb ? 540 : undefined,
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
            options={{ headerShown: false, title: 'Home' }}
          />
          <Stack.Screen
            name="size"
            options={{ title: 'Size & paper', headerBackTitle: 'Home' }}
          />
          <Stack.Screen
            name="saved"
            options={{ title: 'Saved', headerBackTitle: 'Home' }}
          />
          <Stack.Screen
            name="photo"
            options={{ title: 'Photo', headerBackTitle: 'Home' }}
          />
          <Stack.Screen
            name="camera"
            options={{
              title: '',
              presentation: 'fullScreenModal',
              headerTransparent: true,
              headerShadowVisible: false,
              headerStyle: { backgroundColor: 'transparent' },
              headerTintColor: '#fff',
              contentStyle: { backgroundColor: '#000' },
            }}
          />
          <Stack.Screen
            name="crop"
            options={{ title: 'Crop', headerBackTitle: 'Home' }}
          />
          <Stack.Screen
            name="person/[id]/crop"
            options={{ title: 'Crop', headerBackTitle: 'Home' }}
          />
          <Stack.Screen name="sheet" options={{ title: 'Print sheet' }} />
          <Stack.Screen
            name="export"
            options={{ title: 'Share', headerBackTitle: 'Sheet' }}
          />
        </Stack>
      </GestureHandlerRootView>
    </View>
  );
}

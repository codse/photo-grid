import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
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
import * as SplashScreen from 'expo-splash-screen';
import { colors, fonts } from '@/ui/tokens';
import { useSession } from '@/state/session';
import { loadPrefs, savePrefs } from '@/platform/prefs';
import { initAds } from '@/monetization/ads';
import { configurePurchases } from '@/monetization/purchases';
import { initI18n } from '@/i18n';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
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

  const hydratePrefs = useSession((s) => s.hydratePrefs);
  const photoId = useSession((s) => s.photoId);
  const paperId = useSession((s) => s.paperId);
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
    void configurePurchases()
      .then(() => initAds())
      .catch((e) => {
        if (__DEV__) console.warn('[monetization] init failed', e);
      });
  }, []);

  useEffect(() => {
    if (!prefsHydrated) return;
    void savePrefs({ photoId, paperId, savedPresets });
  }, [photoId, paperId, savedPresets, prefsHydrated]);

  useEffect(() => {
    if (fontsLoaded && i18nReady) void SplashScreen.hideAsync();
  }, [fontsLoaded, i18nReady]);

  if (!fontsLoaded || !i18nReady) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
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
        {/* Brand lives in the home hero — title still used for back button label */}
        <Stack.Screen
          name="index"
          options={{ headerShown: false, title: 'Home', headerBackTitle: 'Home' }}
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
          options={{ title: 'Camera', presentation: 'fullScreenModal' }}
        />
        <Stack.Screen
          name="crop"
          options={{ title: 'Crop', headerBackTitle: 'Home' }}
        />
        <Stack.Screen
          name="person/[id]/crop"
          options={{ title: 'Crop', headerBackTitle: 'Home' }}
        />
        <Stack.Screen
          name="sheet"
          options={{ title: 'Print sheet' }}
        />
        <Stack.Screen
          name="export"
          options={{ title: 'Share', headerBackTitle: 'Sheet' }}
        />
        <Stack.Screen
          name="settings"
          options={{ title: 'Settings', headerBackTitle: 'Home' }}
        />
        <Stack.Screen name="about" options={{ title: 'About' }} />
        <Stack.Screen name="privacy" options={{ title: 'Privacy Policy' }} />
        <Stack.Screen name="terms" options={{ title: 'Terms of Use' }} />
        <Stack.Screen name="disclaimer" options={{ title: 'Disclaimer' }} />
      </Stack>
    </GestureHandlerRootView>
  );
}

import { useEffect } from 'react';
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
import * as SplashScreen from 'expo-splash-screen';
import { colors, fonts } from '@/ui/tokens';
import { useSession } from '@/state/session';
import { loadPrefs, savePrefs } from '@/platform/prefs';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
    Figtree_700Bold,
  });

  const hydratePrefs = useSession((s) => s.hydratePrefs);
  const photoId = useSession((s) => s.photoId);
  const paperId = useSession((s) => s.paperId);
  const recentConfigs = useSession((s) => s.recentConfigs);
  const prefsHydrated = useSession((s) => s.prefsHydrated);

  useEffect(() => {
    void (async () => {
      const prefs = await loadPrefs();
      if (prefs) hydratePrefs(prefs);
      else hydratePrefs({ photoId, paperId });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!prefsHydrated) return;
    void savePrefs({ photoId, paperId, recentConfigs });
  }, [photoId, paperId, recentConfigs, prefsHydrated]);

  useEffect(() => {
    if (fontsLoaded) void SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

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
        {/* Brand lives in the home hero — no duplicate nav title */}
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="size" options={{ title: 'Size & paper' }} />
        <Stack.Screen name="saved" options={{ title: 'Saved sheets' }} />
        <Stack.Screen name="photo" options={{ title: 'Photo' }} />
        <Stack.Screen
          name="camera"
          options={{ title: 'Camera', presentation: 'fullScreenModal' }}
        />
        <Stack.Screen name="crop" options={{ title: 'Crop' }} />
        <Stack.Screen name="person/[id]/crop" options={{ title: 'Crop' }} />
        <Stack.Screen name="sheet" options={{ title: 'Print sheet' }} />
        <Stack.Screen name="export" options={{ title: 'Share' }} />
      </Stack>
    </GestureHandlerRootView>
  );
}

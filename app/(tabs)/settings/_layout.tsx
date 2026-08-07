import { Stack } from 'expo-router';
import { Platform } from 'react-native';
import { colors } from '@/ui/tokens';

const GROUPED_BG = Platform.OS === 'ios' ? '#F2F2F7' : colors.bg;

export default function SettingsStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerTintColor: colors.ink,
        headerStyle: { backgroundColor: GROUPED_BG },
        contentStyle: { backgroundColor: GROUPED_BG },
        headerTitleStyle: { fontWeight: '600', color: colors.ink },
        headerBackTitle: 'Settings',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Settings' }} />
      <Stack.Screen name="help" options={{ title: 'Help' }} />
      <Stack.Screen name="faq" options={{ title: 'FAQ' }} />
      <Stack.Screen name="about" options={{ title: 'About' }} />
      <Stack.Screen name="privacy" options={{ title: 'Privacy Policy' }} />
      <Stack.Screen name="terms" options={{ title: 'Terms of Use' }} />
      <Stack.Screen name="disclaimer" options={{ title: 'Disclaimer' }} />
    </Stack>
  );
}

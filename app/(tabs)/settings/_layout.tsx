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
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Settings' }} />
    </Stack>
  );
}

import { Stack } from 'expo-router';
import { Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '@/ui/tokens';

const GROUPED_BG = Platform.OS === 'ios' ? '#F2F2F7' : colors.bg;

export default function SettingsStackLayout() {
  const { t } = useTranslation();
  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerTintColor: colors.ink,
        headerStyle: { backgroundColor: GROUPED_BG },
        contentStyle: { backgroundColor: GROUPED_BG },
        headerTitleStyle: { fontWeight: '600', color: colors.ink },
        headerBackTitle: t('settings.title'),
      }}
    >
      <Stack.Screen name="index" options={{ title: t('settings.title') }} />
      <Stack.Screen name="help" options={{ title: t('settings.helpSection') }} />
      <Stack.Screen name="faq" options={{ title: t('settings.faq') }} />
      <Stack.Screen name="about" options={{ title: t('settings.about') }} />
      <Stack.Screen name="privacy" options={{ title: t('settings.privacy') }} />
      <Stack.Screen name="terms" options={{ title: t('settings.terms') }} />
      <Stack.Screen
        name="disclaimer"
        options={{ title: t('settings.disclaimer') }}
      />
    </Stack>
  );
}

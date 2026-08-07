import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ProPaywall } from '@/monetization/pro-paywall';
import { colors } from '@/ui/tokens';

export default function ProScreen() {
  const { t } = useTranslation();

  return (
    <>
      <Stack.Screen
        options={{
          title: t('pro.title'),
          headerShadowVisible: false,
          headerTintColor: colors.ink,
          headerStyle: { backgroundColor: colors.bg },
          contentStyle: { backgroundColor: colors.bg },
          presentation: Platform.OS === 'ios' ? 'modal' : 'card',
        }}
      />
      <ProPaywall />
    </>
  );
}

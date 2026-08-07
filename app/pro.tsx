import { Platform } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ProPaywall } from '@/monetization/pro-paywall';
import { coerceProReason } from '@/monetization/pro-route';
import { colors } from '@/ui/tokens';

export default function ProScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ reason?: string | string[] }>();
  const raw = Array.isArray(params.reason) ? params.reason[0] : params.reason;
  const reason = coerceProReason(raw);

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
      <ProPaywall reason={reason} />
    </>
  );
}

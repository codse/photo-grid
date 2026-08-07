import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircleIcon } from 'phosphor-react-native/src/icons/CheckCircle';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { LIFETIME_PRICE_LABEL } from './catalog';
import {
  getCachedIsPro,
  isPro,
  lifetimePriceString,
  purchaseLifetime,
  restorePurchases,
} from './purchases';
import { Button } from '@/ui/primitives';
import { colors, fonts, radii, space, type } from '@/ui/tokens';

const FEATURE_KEYS = [
  'pro.featureAds',
  'pro.featureLifetime',
  'pro.featureApple',
] as const;

/** Full-screen Lifetime paywall — price, features, buy, restore. */
export function ProPaywall() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [pro, setPro] = useState(getCachedIsPro());
  const [price, setPrice] = useState(LIFETIME_PRICE_LABEL);
  const [busy, setBusy] = useState<'buy' | 'restore' | null>(null);

  const refresh = useCallback(async () => {
    setPro(await isPro());
    const live = await lifetimePriceString();
    if (live) setPrice(live);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const buy = async () => {
    setBusy('buy');
    try {
      const result = await purchaseLifetime();
      if (result.status === 'success') {
        setPro(true);
        Alert.alert(t('pro.purchaseOkTitle'), t('pro.purchaseOkBody'), [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else if (result.status === 'error' || result.status === 'unavailable') {
        Alert.alert(t('pro.purchaseFailedTitle'), result.message);
      }
    } finally {
      setBusy(null);
    }
  };

  const restore = async () => {
    setBusy('restore');
    try {
      const result = await restorePurchases();
      if (result.status === 'success') {
        setPro(true);
        Alert.alert(t('pro.restoredTitle'), t('pro.restoredBody'), [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else if (result.status === 'error' || result.status === 'unavailable') {
        Alert.alert(t('pro.restoreFailedTitle'), result.message);
      }
    } finally {
      setBusy(null);
    }
  };

  if (pro) {
    return (
      <View
        style={[
          styles.root,
          { paddingBottom: Math.max(insets.bottom, space.lg) },
        ]}
      >
        <View style={styles.hero}>
          <View style={styles.pill}>
            <Text style={styles.pillText}>{t('pro.proPass')}</Text>
          </View>
          <Text style={styles.headline}>{t('pro.unlockedTitle')}</Text>
          <Text style={styles.sub}>{t('pro.unlockedSub')}</Text>
        </View>
        <Button label={t('common.done')} onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: space.lg },
        ]}
        bounces={false}
      >
        <View style={styles.hero}>
          <View style={styles.pill}>
            <Text style={styles.pillText}>{t('pro.once')}</Text>
          </View>
          <Text style={styles.headline}>{t('pro.headline')}</Text>
          <Text style={styles.sub}>{t('pro.sub')}</Text>
        </View>

        <View style={styles.priceBlock}>
          <Text style={styles.price}>{price}</Text>
          <Text style={styles.priceHint}>{t('pro.lifetimeApple')}</Text>
        </View>

        <View style={styles.features}>
          {FEATURE_KEYS.map((key) => (
            <View key={key} style={styles.featureRow}>
              <CheckCircleIcon
                size={22}
                color={colors.accent}
                weight="fill"
              />
              <Text style={styles.featureText}>{t(key)}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <View
        style={[
          styles.footer,
          { paddingBottom: Math.max(insets.bottom, space.lg) },
        ]}
      >
        <Button
          label={
            busy === 'buy'
              ? t('pro.buying')
              : t('pro.ctaPrice', { price })
          }
          disabled={busy != null}
          onPress={() => void buy()}
        />
        <Pressable
          accessibilityRole="button"
          disabled={busy != null}
          onPress={() => void restore()}
          hitSlop={8}
          style={({ pressed }) => [
            styles.restoreHit,
            { opacity: pressed || busy ? 0.6 : 1 },
          ]}
        >
          {busy === 'restore' ? (
            <ActivityIndicator color={colors.inkMuted} />
          ) : (
            <Text style={styles.restore}>{t('pro.restore')}</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    paddingHorizontal: space.xl,
    paddingTop: space.lg,
    gap: space.xl,
  },
  hero: {
    gap: space.sm,
    alignItems: 'flex-start',
  },
  pill: {
    backgroundColor: '#FFD166',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.ink,
    transform: [{ rotate: '-4deg' }],
    marginBottom: 4,
  },
  pillText: {
    fontFamily: fonts.playful,
    fontSize: 11,
    color: colors.ink,
    letterSpacing: 1.3,
  },
  headline: {
    fontFamily: fonts.playful,
    fontSize: 32,
    lineHeight: 36,
    color: colors.ink,
    letterSpacing: -0.6,
  },
  sub: {
    ...type.body,
    color: colors.inkMuted,
    maxWidth: 320,
  },
  priceBlock: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: space.md,
    backgroundColor: colors.accentSoft,
    borderRadius: radii.lg,
    borderCurve: 'continuous',
  },
  price: {
    fontFamily: fonts.playful,
    fontSize: 40,
    lineHeight: 44,
    color: colors.ink,
    letterSpacing: -1,
  },
  priceHint: {
    ...type.caption,
    color: colors.inkMuted,
  },
  features: {
    gap: space.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  featureText: {
    ...type.body,
    flex: 1,
    color: colors.ink,
  },
  footer: {
    paddingHorizontal: space.xl,
    paddingTop: space.md,
    gap: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    backgroundColor: colors.bg,
  },
  restoreHit: {
    alignSelf: 'center',
    minHeight: 36,
    justifyContent: 'center',
    paddingVertical: 4,
  },
  restore: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.inkMuted,
  },
});

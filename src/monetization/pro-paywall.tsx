import { useCallback, useEffect, useMemo, useState } from 'react';
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
  FREE_EXPORTS_PER_DAY,
  FREE_MAX_PEOPLE,
  getDailyExportCount,
} from './free-limits';
import {
  getCachedIsPro,
  isPro,
  lifetimePriceString,
  purchaseLifetime,
  restorePurchases,
} from './purchases';
import type { ProReason } from './pro-route';
import { Button } from '@/ui/primitives';
import { colors, fonts, radii, space, type } from '@/ui/tokens';

type Feature = {
  key:
    | 'pro.featureAds'
    | 'pro.featureExports'
    | 'pro.featurePeople'
    | 'pro.featureLifetime'
    | 'pro.featureApple';
  reason?: ProReason;
};

const FEATURES: Feature[] = [
  { key: 'pro.featurePeople', reason: 'people' },
  { key: 'pro.featureExports', reason: 'exports' },
  { key: 'pro.featureAds', reason: 'ads' },
  { key: 'pro.featureLifetime' },
  { key: 'pro.featureApple' },
];

type Props = {
  /** Gated action that opened the paywall — highlights matching feature. */
  reason?: ProReason;
};

/** Full-screen Lifetime paywall — price, features, buy, restore. */
export function ProPaywall({ reason }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [pro, setPro] = useState(getCachedIsPro());
  const [price, setPrice] = useState(LIFETIME_PRICE_LABEL);
  const [busy, setBusy] = useState<'buy' | 'restore' | null>(null);
  const [exportsUsed, setExportsUsed] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    setPro(await isPro());
    const live = await lifetimePriceString();
    if (live) setPrice(live);
    if (reason === 'exports') {
      setExportsUsed(await getDailyExportCount());
    }
  }, [reason]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const hero = useMemo(() => {
    if (reason === 'people') {
      return {
        headline: t('pro.reasonPeopleHeadline'),
        sub: t('pro.limitPeopleBody', { limit: FREE_MAX_PEOPLE }),
      };
    }
    if (reason === 'exports') {
      return {
        headline: t('pro.reasonExportsHeadline'),
        sub: t('pro.limitExportBody', { limit: FREE_EXPORTS_PER_DAY }),
      };
    }
    if (reason === 'ads') {
      return {
        headline: t('pro.reasonAdsHeadline'),
        sub: t('pro.reasonAdsSub'),
      };
    }
    return {
      headline: t('pro.headline'),
      sub: t('pro.sub'),
    };
  }, [reason, t]);

  const features = useMemo(() => {
    if (!reason) return FEATURES;
    return [
      ...FEATURES.filter((f) => f.reason === reason),
      ...FEATURES.filter((f) => f.reason !== reason),
    ];
  }, [reason]);

  const buy = async () => {
    setBusy('buy');
    try {
      const result = await purchaseLifetime();
      if (result.status === 'success') {
        setPro(true);
        Alert.alert(t('pro.purchaseOkTitle'), t('pro.purchaseOkBody'), [
          { text: t('common.done'), onPress: () => router.back() },
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
          { text: t('common.done'), onPress: () => router.back() },
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
      <View style={styles.root}>
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            styles.unlockedScroll,
            { paddingBottom: space.lg },
          ]}
          bounces={false}
        >
          <View style={styles.unlockedHero}>
            <View style={styles.pill}>
              <Text style={styles.pillText}>{t('pro.proPass')}</Text>
            </View>
            <Text style={styles.headline}>{t('pro.unlockedTitle')}</Text>
            <Text style={[styles.sub, styles.unlockedSub]}>
              {t('pro.unlockedSub')}
            </Text>
          </View>

          <View style={styles.features}>
            {FEATURES.map((feature) => (
              <View key={feature.key} style={styles.featureRow}>
                <CheckCircleIcon
                  size={22}
                  color={colors.accent}
                  weight="fill"
                />
                <Text style={styles.featureText}>{t(feature.key)}</Text>
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
          <Button label={t('common.done')} onPress={() => router.back()} />
        </View>
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
          <Text style={styles.headline}>{hero.headline}</Text>
          <Text style={styles.sub}>{hero.sub}</Text>
          {reason === 'exports' ? (
            <View style={styles.limitChip}>
              <Text style={styles.limitChipText}>
                {t('pro.exportsUsedToday', {
                  used: exportsUsed ?? FREE_EXPORTS_PER_DAY,
                  limit: FREE_EXPORTS_PER_DAY,
                })}
              </Text>
              <Text style={styles.limitChipHint}>
                {t('pro.exportsResetsHint')}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.priceBlock}>
          <Text style={styles.price}>{price}</Text>
          <Text style={styles.priceHint}>{t('pro.lifetimeApple')}</Text>
        </View>

        <View style={styles.features}>
          {features.map((feature) => {
            const highlighted = !!reason && feature.reason === reason;
            return (
              <View
                key={feature.key}
                style={[
                  styles.featureRow,
                  highlighted && styles.featureRowHighlight,
                ]}
              >
                <CheckCircleIcon
                  size={22}
                  color={highlighted ? colors.ink : colors.accent}
                  weight="fill"
                />
                <Text
                  style={[
                    styles.featureText,
                    highlighted && styles.featureTextHighlight,
                  ]}
                >
                  {t(feature.key)}
                </Text>
                {highlighted ? (
                  <View style={styles.featureBadge}>
                    <Text style={styles.featureBadgeText}>
                      {t('pro.reasonHighlight')}
                    </Text>
                  </View>
                ) : null}
              </View>
            );
          })}
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
  unlockedScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: space.xxl,
  },
  hero: {
    gap: space.sm,
    alignItems: 'flex-start',
  },
  unlockedHero: {
    gap: space.sm,
    alignItems: 'flex-start',
  },
  unlockedSub: {
    maxWidth: undefined,
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
  limitChip: {
    alignSelf: 'stretch',
    marginTop: space.sm,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radii.md,
    borderCurve: 'continuous',
    borderWidth: 2,
    borderColor: colors.ink,
    backgroundColor: '#FFD166',
    gap: 2,
  },
  limitChipText: {
    fontFamily: fonts.playful,
    fontSize: 16,
    color: colors.ink,
    letterSpacing: -0.3,
  },
  limitChipHint: {
    ...type.caption,
    color: colors.inkMuted,
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
    gap: space.sm,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  featureRowHighlight: {
    backgroundColor: '#FFD166',
    borderRadius: radii.md,
    borderCurve: 'continuous',
    borderWidth: 2,
    borderColor: colors.ink,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  featureText: {
    ...type.body,
    flex: 1,
    color: colors.ink,
  },
  featureTextHighlight: {
    fontFamily: fonts.semibold,
  },
  featureBadge: {
    backgroundColor: colors.ink,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  featureBadgeText: {
    fontFamily: fonts.playful,
    fontSize: 10,
    color: '#FFD166',
    letterSpacing: 0.6,
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

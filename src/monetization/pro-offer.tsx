import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Pattern, Rect } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { LIFETIME_PRICE_LABEL } from './catalog';
import {
  getCachedIsPro,
  isPro,
  lifetimePriceString,
  purchaseLifetime,
  restorePurchases,
} from './purchases';
import { colors, fonts, space, type } from '@/ui/tokens';

type Props = {
  /** Compact row for home lists vs fuller card. */
  variant?: 'row' | 'card';
};

const R = 18;
const LIP = 3;
const CORE = 58;
const BADGE = CORE + 24; // core + orbit gap + stroke room

/** Soft candy stripes — game merch vibe without eating height. */
function StripeWash() {
  const stripe = 14;
  return (
    <Svg
      width="100%"
      height="100%"
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    >
      <Defs>
        <Pattern
          id="proWash"
          patternUnits="userSpaceOnUse"
          width={stripe * 2}
          height={stripe * 2}
          patternTransform="rotate(28)"
        >
          <Rect x={0} y={0} width={stripe} height={stripe * 2} fill="#FFD8C4" />
          <Rect
            x={stripe}
            y={0}
            width={stripe}
            height={stripe * 2}
            fill="#FFEDE3"
          />
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#proWash)" />
    </Svg>
  );
}

/** Price in a round badge with a slow-spinning dashed orbit. */
function PriceBadge({ price }: { price: string }) {
  const spin = useSharedValue(0);

  useEffect(() => {
    spin.value = withRepeat(
      withTiming(360, { duration: 10000, easing: Easing.linear }),
      -1,
      false,
    );
  }, [spin]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value}deg` }],
  }));

  const cx = BADGE / 2;
  // Clear air gap so the orbit reads as a badge ring, not a double border.
  const orbitR = CORE / 2 + 8;

  return (
    <View style={styles.badge} pointerEvents="none">
      <Animated.View style={[styles.badgeOrbit, ringStyle]}>
        <Svg width={BADGE} height={BADGE}>
          <Circle
            cx={cx}
            cy={cx}
            r={orbitR}
            fill="none"
            stroke={colors.ink}
            strokeWidth={2.25}
            strokeDasharray="4.5 5.5"
            strokeLinecap="round"
          />
        </Svg>
      </Animated.View>
      <View style={styles.badgeCore}>
        <Text
          style={styles.badgePrice}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.65}
        >
          {price}
        </Text>
      </View>
    </View>
  );
}

/** Hard offset plate that follows the same radius — no broken boxShadow corners. */
function RaisedPlate({
  children,
  dark,
  pressed,
}: {
  children: ReactNode;
  dark?: boolean;
  pressed?: boolean;
}) {
  return (
    <View style={[styles.plateOuter, pressed && styles.plateOuterPressed]}>
      <View
        style={[
          styles.plateShadow,
          dark && styles.plateShadowDark,
          pressed && { opacity: 0 },
        ]}
      />
      <View style={[styles.plateFace, dark && styles.plateFaceDark]}>{children}</View>
    </View>
  );
}

export function ProOffer({ variant = 'row' }: Props) {
  const { t } = useTranslation();
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
        Alert.alert(t('pro.purchaseOkTitle'), t('pro.purchaseOkBody'));
      } else if (result.status === 'error' || result.status === 'unavailable') {
        Alert.alert('Purchase', result.message);
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
        Alert.alert(t('pro.restoredTitle'), t('pro.restoredBody'));
      } else if (result.status === 'error' || result.status === 'unavailable') {
        Alert.alert('Restore', result.message);
      }
    } finally {
      setBusy(null);
    }
  };

  if (pro) {
    // Unlocked state lives in the home header badge — no footer card.
    return null;
  }

  if (variant === 'card') {
    return (
      <View style={styles.wrap}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Unlock Pro for ${price}`}
          disabled={busy != null}
          onPress={() => void buy()}
        >
          {({ pressed }) => (
            <RaisedPlate pressed={pressed || busy === 'buy'}>
              <StripeWash />
              <View style={styles.burst}>
                <Text style={styles.burstText}>{t('pro.once')}</Text>
              </View>
              <View style={[styles.row, busy != null && { opacity: 0.85 }]}>
                <View style={styles.copy}>
                  <Text style={styles.headline}>{t('pro.headline')}</Text>
                  <Text style={styles.sub}>{t('pro.sub')}</Text>
                  <View style={styles.ctaOuter}>
                    <View style={styles.ctaShadow} />
                    <View style={styles.ctaFace}>
                      {busy === 'buy' ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.ctaLabel}>{t('pro.unlock')}</Text>
                      )}
                    </View>
                  </View>
                </View>
                <PriceBadge price={price} />
              </View>
            </RaisedPlate>
          )}
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={busy != null}
          onPress={() => void restore()}
          hitSlop={8}
          style={styles.restoreHit}
        >
          <Text style={styles.restore}>
            {busy === 'restore' ? t('pro.restoring') : t('pro.restore')}
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        disabled={busy != null}
        onPress={() => void buy()}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: 14,
          paddingHorizontal: space.lg,
          backgroundColor: pressed ? '#D1D1D6' : 'transparent',
          opacity: busy ? 0.85 : 1,
        })}
      >
        <View style={{ flex: 1, gap: 2, paddingRight: space.md }}>
          <Text
            style={{
              fontSize: 17,
              fontWeight: '400',
              letterSpacing: -0.2,
              color: colors.ink,
            }}
          >
            {t('pro.removeAdsPrice', { price })}
          </Text>
          <Text style={{ fontSize: 13, color: colors.inkMuted, lineHeight: 18 }}>
            {t('pro.lifetimeApple')}
          </Text>
        </View>
        {busy === 'buy' ? (
          <ActivityIndicator color={colors.accent} />
        ) : (
          <Text style={{ fontSize: 17, fontWeight: '400', color: colors.accent }}>
            {t('pro.buy')}
          </Text>
        )}
      </Pressable>
      <Pressable
        accessibilityRole="button"
        disabled={busy != null}
        onPress={() => void restore()}
        style={({ pressed }) => ({
          paddingHorizontal: space.lg,
          paddingVertical: 12,
          backgroundColor: pressed ? '#D1D1D6' : 'transparent',
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: '#C6C6C8',
        })}
      >
        <Text style={{ fontSize: 17, color: colors.inkMuted }}>
          {busy === 'restore' ? t('pro.restoring') : t('pro.restore')}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  plateOuter: {
    position: 'relative',
    marginBottom: LIP,
  },
  plateOuterPressed: {
    transform: [{ translateY: 2 }],
  },
  plateShadow: {
    ...StyleSheet.absoluteFill,
    top: LIP,
    backgroundColor: colors.ink,
    borderRadius: R,
    borderCurve: 'continuous',
  },
  plateShadowDark: {
    backgroundColor: '#1A1512',
  },
  plateFace: {
    borderRadius: R,
    borderCurve: 'continuous',
    overflow: 'hidden',
    borderWidth: 2.5,
    borderColor: colors.ink,
    backgroundColor: '#FFE8DC',
  },
  plateFaceDark: {
    backgroundColor: colors.ink,
  },
  burst: {
    position: 'absolute',
    top: 8,
    left: 10,
    zIndex: 2,
    backgroundColor: '#FFD166',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.ink,
    transform: [{ rotate: '-7deg' }],
  },
  burstText: {
    fontFamily: fonts.playful,
    fontSize: 10,
    color: colors.ink,
    letterSpacing: 1.4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: space.lg,
    paddingTop: 28,
    paddingBottom: 14,
    paddingRight: 10,
    gap: 10,
  },
  rowPro: {
    paddingHorizontal: space.lg,
    paddingVertical: 14,
  },
  copy: {
    flex: 1,
    gap: 4,
    zIndex: 1,
  },
  headline: {
    fontFamily: fonts.playful,
    fontSize: 22,
    lineHeight: 26,
    color: colors.ink,
    letterSpacing: -0.5,
  },
  headlineLight: {
    fontFamily: fonts.playful,
    fontSize: 20,
    lineHeight: 24,
    color: '#fff',
    letterSpacing: -0.4,
  },
  eyebrowLight: {
    fontFamily: fonts.playful,
    fontSize: 11,
    color: '#FFD166',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  sub: {
    fontFamily: fonts.playfulMedium,
    fontSize: 13,
    lineHeight: 17,
    color: colors.inkMuted,
    marginBottom: 6,
  },
  subLight: {
    fontFamily: fonts.playfulMedium,
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
  },
  ctaOuter: {
    alignSelf: 'flex-start',
    position: 'relative',
    marginBottom: LIP,
  },
  ctaShadow: {
    ...StyleSheet.absoluteFill,
    top: LIP,
    backgroundColor: '#C44A1F',
    borderRadius: 12,
    borderCurve: 'continuous',
  },
  ctaFace: {
    backgroundColor: colors.accent,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderCurve: 'continuous',
    borderWidth: 2,
    borderColor: colors.ink,
    minWidth: 96,
    alignItems: 'center',
  },
  ctaLabel: {
    fontFamily: fonts.playful,
    fontSize: 15,
    color: '#fff',
    letterSpacing: -0.2,
  },
  badge: {
    width: BADGE,
    height: BADGE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeOrbit: {
    position: 'absolute',
    width: BADGE,
    height: BADGE,
    left: 0,
    top: 0,
  },
  badgeCore: {
    width: CORE,
    height: CORE,
    borderRadius: CORE / 2,
    backgroundColor: '#FFF8F3',
    borderWidth: 2.5,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgePrice: {
    fontFamily: fonts.playful,
    fontSize: 16,
    color: colors.ink,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  restoreHit: {
    alignSelf: 'center',
    paddingVertical: 2,
  },
  restore: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.inkFaint,
  },
});

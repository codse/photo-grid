import { useEffect } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { colors, fonts } from '@/ui/tokens';

type Props = {
  /** Unlocked marker vs acquisition CTA. */
  variant?: 'pro' | 'get';
  onPress?: () => void;
  busy?: boolean;
};

/** Gold pill for nav chrome — shine only on the Get Pro CTA. */
export function ProBadge({ variant = 'pro', onPress, busy }: Props) {
  const shine = useSharedValue(-1);
  const showShine = variant === 'get';

  useEffect(() => {
    if (!showShine) {
      cancelAnimation(shine);
      shine.value = -1;
      return;
    }
    shine.value = withRepeat(
      withSequence(
        withTiming(1.4, {
          duration: 950,
          easing: Easing.inOut(Easing.quad),
        }),
        withTiming(-1, { duration: 0 }),
        withDelay(2400, withTiming(-1, { duration: 0 })),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(shine);
  }, [shine, showShine]);

  const shineStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: shine.value * 72 },
      { skewX: '-22deg' },
    ],
  }));

  const label = variant === 'get' ? 'GET PRO' : 'PRO';
  const interactive = !!onPress && !busy;

  const body = (
    <View
      accessibilityLabel={label}
      accessibilityRole={interactive ? 'button' : 'text'}
      style={[styles.wrap, variant === 'get' && styles.wrapGet]}
    >
      {showShine ? (
        <Animated.View pointerEvents="none" style={[styles.shine, shineStyle]} />
      ) : null}
      {busy ? (
        <ActivityIndicator color={colors.ink} size="small" />
      ) : (
        <Text style={[styles.label, variant === 'get' && styles.labelGet]}>
          {label}
        </Text>
      )}
    </View>
  );

  if (!interactive) return body;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => ({ opacity: pressed ? 0.82 : 1 })}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    paddingHorizontal: 9,
    paddingVertical: 5,
    minWidth: 44,
    minHeight: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    borderCurve: 'continuous',
    backgroundColor: '#FFD166',
    borderWidth: 1.5,
    borderColor: colors.ink,
    shadowColor: '#B45309',
    shadowOpacity: Platform.OS === 'ios' ? 0.25 : 0,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  wrapGet: {
    paddingHorizontal: 11,
    backgroundColor: '#FFC107',
  },
  shine: {
    position: 'absolute',
    top: -6,
    bottom: -6,
    left: 0,
    width: 18,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  label: {
    fontFamily: fonts.playful,
    fontSize: 11,
    lineHeight: 13,
    color: colors.ink,
    letterSpacing: 1.15,
  },
  labelGet: {
    fontSize: 11,
    letterSpacing: 0.9,
  },
});

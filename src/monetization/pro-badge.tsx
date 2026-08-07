import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors, fonts } from '@/ui/tokens';
import { useTranslation } from 'react-i18next';

type Props = {
  /** Unlocked marker vs acquisition CTA. */
  variant?: 'pro' | 'get';
  onPress?: () => void;
  busy?: boolean;
};

/** Quiet nav chrome — sell Pro after value, not on first paint. */
export function ProBadge({ variant = 'pro', onPress, busy }: Props) {
  const { t } = useTranslation();
  const label = variant === 'get' ? t('pro.badgeGet') : t('pro.badge');
  const interactive = !!onPress && !busy;
  const isGet = variant === 'get';

  const body = (
    <View
      accessibilityLabel={label}
      accessibilityRole={interactive ? 'button' : 'text'}
      style={[styles.wrap, isGet ? styles.wrapGet : styles.wrapPro]}
    >
      {busy ? (
        <ActivityIndicator color={colors.ink} size="small" />
      ) : (
        <Text style={[styles.label, isGet && styles.labelGet]}>{label}</Text>
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
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 36,
    minHeight: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    borderCurve: 'continuous',
  },
  wrapPro: {
    backgroundColor: 'rgba(184, 149, 63, 0.18)',
  },
  wrapGet: {
    backgroundColor: 'transparent',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.inkFaint,
  },
  label: {
    fontFamily: fonts.playful,
    fontSize: 11,
    lineHeight: 13,
    color: colors.ink,
    letterSpacing: 0.8,
  },
  labelGet: {
    color: colors.inkMuted,
    letterSpacing: 0.6,
    ...Platform.select({
      ios: { fontWeight: '600' as const },
      default: null,
    }),
  },
});

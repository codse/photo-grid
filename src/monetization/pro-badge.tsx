import {
  ActivityIndicator,
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

/** Nav chrome — GET PRO to unlock; solid gold PRO when owned. */
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
      style={({ pressed }) => ({ opacity: pressed ? 0.82 : 1 })}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    minWidth: 44,
    minHeight: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    borderCurve: 'continuous',
  },
  /** Unlocked — gold fill, quiet PRO mark. */
  wrapPro: {
    backgroundColor: '#FFD166',
    borderWidth: 1.5,
    borderColor: colors.ink,
  },
  /** Locked — ink pill, white GET PRO. */
  wrapGet: {
    paddingHorizontal: 11,
    backgroundColor: colors.ink,
    borderWidth: 0,
  },
  label: {
    fontFamily: fonts.playful,
    fontSize: 11,
    lineHeight: 13,
    color: colors.ink,
    letterSpacing: 1.15,
  },
  labelGet: {
    color: '#FFFFFF',
    letterSpacing: 0.9,
  },
});

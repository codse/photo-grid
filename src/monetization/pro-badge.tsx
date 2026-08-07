import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '@/ui/tokens';

/** Compact lifetime Pro marker for headers. */
export function ProBadge() {
  return (
    <View
      accessibilityLabel="Pro"
      accessibilityRole="text"
      style={styles.wrap}
    >
      <Text style={styles.label}>PRO</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderCurve: 'continuous',
    backgroundColor: '#FFD166',
    borderWidth: 1.5,
    borderColor: colors.ink,
  },
  label: {
    fontFamily: fonts.playful,
    fontSize: 10,
    lineHeight: 12,
    color: colors.ink,
    letterSpacing: 1.1,
  },
});

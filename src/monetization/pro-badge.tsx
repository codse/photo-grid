import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '@/ui/tokens';

/** Compact lifetime Pro marker for nav chrome. */
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
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderCurve: 'continuous',
    backgroundColor: '#FFD166',
    borderWidth: 1.5,
    borderColor: colors.ink,
    // Soft lift so it reads against the grouped header.
    shadowColor: '#B45309',
    shadowOpacity: 0.28,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  label: {
    fontFamily: fonts.playful,
    fontSize: 11,
    lineHeight: 13,
    color: colors.ink,
    letterSpacing: 1.2,
  },
});

import { View } from 'react-native';
import { colors } from '@/ui/tokens';

type Props = {
  width?: number;
  /** Light cells on dark/accent surfaces. */
  onAccent?: boolean;
};

/** Tiny 4×6 print sheet glyph — product outcome, not decoration. */
export function SheetPreviewMark({ width = 72, onAccent = false }: Props) {
  const height = Math.round(width * 1.5);
  const pad = Math.max(4, Math.round(width * 0.08));
  const gap = Math.max(2, Math.round(width * 0.04));
  const cols = 2;
  const rows = 3;
  const cellW = (width - pad * 2 - gap * (cols - 1)) / cols;
  const cellH = (height - pad * 2 - gap * (rows - 1)) / rows;

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width,
        height,
        borderRadius: 8,
        borderCurve: 'continuous',
        backgroundColor: onAccent ? 'rgba(255,255,255,0.95)' : colors.bgElevated,
        borderWidth: onAccent ? 0 : 1,
        borderColor: colors.line,
        padding: pad,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap,
        shadowColor: '#000',
        shadowOpacity: onAccent ? 0.12 : 0,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
      }}
    >
      {Array.from({ length: cols * rows }, (_, i) => (
        <View
          key={i}
          style={{
            width: cellW,
            height: cellH,
            borderRadius: 3,
            borderCurve: 'continuous',
            backgroundColor: onAccent
              ? `rgba(184, 149, 63, ${0.22 + i * 0.06})`
              : i === 0
                ? colors.accent
                : `rgba(184, 149, 63, ${0.12 + i * 0.04})`,
          }}
        />
      ))}
    </View>
  );
}

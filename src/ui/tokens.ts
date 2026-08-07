/**
 * Passport Photo Print — soft ochre + white.
 * Primary actions use muted gold-ochre (ties to PRO chrome). Ground stays near-white.
 * Type: Figtree — soft humanist sans (less tech than Space Grotesk).
 */
export const fonts = {
  regular: 'Figtree_400Regular',
  medium: 'Figtree_500Medium',
  semibold: 'Figtree_600SemiBold',
  bold: 'Figtree_700Bold',
  /** Playful / promo display (UIZZE: Commissioner) */
  playful: 'Commissioner_800ExtraBold',
  playfulSemi: 'Commissioner_700Bold',
  playfulMedium: 'Commissioner_600SemiBold',
} as const;

export const colors = {
  bg: '#FFFCF9',
  bgElevated: '#FFFFFF',
  ink: '#2A211C',
  inkMuted: '#7A6F68',
  inkFaint: '#A89F98',
  line: '#EDE4DC',
  accent: '#B8953F',
  accentSoft: 'rgba(184, 149, 63, 0.14)',
  paper: '#FFFFFF',
  danger: '#DC2626',
  success: '#16A34A',
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const type = {
  display: {
    fontFamily: fonts.bold,
    fontSize: 34,
    fontWeight: '700' as const,
    letterSpacing: -0.4,
    lineHeight: 40,
  },
  title: {
    fontFamily: fonts.semibold,
    fontSize: 22,
    fontWeight: '600' as const,
    letterSpacing: -0.2,
    lineHeight: 28,
  },
  body: {
    fontFamily: fonts.regular,
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  caption: {
    fontFamily: fonts.medium,
    fontSize: 13,
    fontWeight: '500' as const,
    letterSpacing: 0.1,
    lineHeight: 18,
  },
  mono: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    fontWeight: '600' as const,
    fontVariant: ['tabular-nums'] as ('tabular-nums')[],
  },
};

export const radii = {
  sm: 8,
  md: 14,
  lg: 20,
} as const;

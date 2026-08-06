import type { ReactNode } from 'react';
import { Pressable, Text, View, type ViewStyle } from 'react-native';
import { colors, radii, space, type } from '@/ui/tokens';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
  style?: ViewStyle;
  icon?: ReactNode;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  style,
  icon,
}: ButtonProps) {
  const bg =
    variant === 'primary'
      ? colors.accent
      : variant === 'secondary'
        ? colors.accentSoft
        : variant === 'danger'
          ? 'rgba(220,38,38,0.1)'
          : 'transparent';
  const fg =
    variant === 'primary'
      ? '#fff'
      : variant === 'danger'
        ? colors.danger
        : variant === 'secondary'
          ? colors.accent
          : colors.inkMuted;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        {
          backgroundColor: bg,
          paddingVertical: 14,
          paddingHorizontal: 16,
          borderRadius: radii.md,
          borderCurve: 'continuous',
          alignItems: 'center',
          flexDirection: 'row',
          justifyContent: 'center',
          gap: 8,
          opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {icon}
      <Text style={{ color: fg, fontWeight: '600', fontSize: 16 }}>{label}</Text>
    </Pressable>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  icon,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
  icon?: ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      style={{
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: radii.sm,
        borderCurve: 'continuous',
        backgroundColor: selected ? colors.accent : colors.bgElevated,
        borderWidth: 1,
        borderColor: selected ? colors.accent : colors.line,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
      }}
    >
      {icon}
      <Text
        style={{
          ...type.caption,
          color: selected ? '#fff' : colors.ink,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function SectionLabel({
  children,
  icon,
}: {
  children: string;
  icon?: ReactNode;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: space.sm,
      }}
    >
      {icon}
      <Text
        style={{
          ...type.caption,
          color: colors.inkFaint,
          textTransform: 'uppercase',
          letterSpacing: 0.8,
        }}
      >
        {children}
      </Text>
    </View>
  );
}

export function ScreenIntro({
  title,
  body,
  icon,
}: {
  title: string;
  body: string;
  icon?: ReactNode;
}) {
  return (
    <View style={{ gap: space.sm, marginBottom: space.lg }}>
      {icon ? (
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: radii.md,
            borderCurve: 'continuous',
            backgroundColor: colors.accentSoft,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 4,
          }}
        >
          {icon}
        </View>
      ) : null}
      <Text style={{ ...type.display, color: colors.ink }}>{title}</Text>
      <Text style={{ ...type.body, color: colors.inkMuted }}>{body}</Text>
    </View>
  );
}

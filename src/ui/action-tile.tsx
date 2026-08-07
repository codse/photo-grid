import type { ReactNode } from 'react';
import { Pressable, Text, View, type ViewStyle } from 'react-native';
import { colors, fonts, radii, space, type } from '@/ui/tokens';

type ActionTileProps = {
  label: string;
  caption?: string;
  icon: ReactNode;
  onPress: () => void;
  disabled?: boolean;
  /** Filled accent vs quiet elevated (default). */
  emphasis?: 'primary' | 'secondary';
  layout?: 'card' | 'row';
  style?: ViewStyle;
};

export function ActionTile({
  label,
  caption,
  icon,
  onPress,
  disabled,
  emphasis = 'secondary',
  layout = 'card',
  style,
}: ActionTileProps) {
  const filled = emphasis === 'primary';
  const row = layout === 'row';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={caption ? `${label}. ${caption}` : label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        {
          flex: row ? undefined : 1,
          minHeight: row ? 64 : 96,
          paddingVertical: row ? space.md : space.lg,
          paddingHorizontal: space.md,
          borderRadius: radii.lg,
          borderCurve: 'continuous',
          backgroundColor: filled
            ? pressed
              ? '#E85F2E'
              : colors.accent
            : pressed
              ? colors.accentSoft
              : colors.bgElevated,
          flexDirection: row ? 'row' : 'column',
          alignItems: 'center',
          justifyContent: row ? 'flex-start' : 'center',
          gap: row ? space.md : 6,
          opacity: disabled ? 0.45 : 1,
          transform: pressed && !disabled ? [{ scale: 0.985 }] : undefined,
        },
        style,
      ]}
    >
      <View style={{ alignItems: 'center', justifyContent: 'center' }}>
        {icon}
      </View>
      <View
        style={{
          gap: 2,
          flex: row ? 1 : undefined,
          alignItems: row ? 'flex-start' : 'center',
        }}
      >
        <Text
          style={{
            ...type.body,
            fontFamily: fonts.semibold,
            fontSize: 15,
            letterSpacing: -0.2,
            color: filled ? '#fff' : colors.ink,
            textAlign: row ? 'left' : 'center',
          }}
        >
          {label}
        </Text>
        {caption ? (
          <Text
            style={{
              ...type.caption,
              color: filled ? 'rgba(255,255,255,0.7)' : colors.inkMuted,
              textAlign: row ? 'left' : 'center',
            }}
          >
            {caption}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

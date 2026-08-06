import type { ReactNode } from 'react';
import { Pressable, Text, View, type ViewStyle } from 'react-native';
import { colors, fonts, radii, space, type } from '@/ui/tokens';

type ActionTileProps = {
  label: string;
  caption?: string;
  icon: ReactNode;
  onPress: () => void;
  disabled?: boolean;
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
  const primary = emphasis === 'primary';
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
          minHeight: row ? 72 : 120,
          padding: space.lg,
          borderRadius: radii.lg,
          borderCurve: 'continuous',
          backgroundColor: primary ? colors.accent : colors.bgElevated,
          borderWidth: primary ? 0 : 1,
          borderColor: colors.line,
          flexDirection: row ? 'row' : 'column',
          alignItems: row ? 'center' : 'stretch',
          justifyContent: row ? 'flex-start' : 'space-between',
          gap: space.md,
          opacity: disabled ? 0.45 : pressed ? 0.88 : 1,
        },
        style,
      ]}
    >
      <View
        style={{
          width: row ? 40 : 44,
          height: row ? 40 : 44,
          borderRadius: radii.sm,
          borderCurve: 'continuous',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: primary
            ? 'rgba(255,255,255,0.12)'
            : colors.accentSoft,
        }}
      >
        {icon}
      </View>
      <View style={{ gap: 2, flex: row ? 1 : undefined }}>
        <Text
          style={{
            ...type.body,
            fontFamily: fonts.semibold,
            color: primary ? '#fff' : colors.ink,
          }}
        >
          {label}
        </Text>
        {caption ? (
          <Text
            style={{
              ...type.caption,
              color: primary ? 'rgba(255,255,255,0.65)' : colors.inkFaint,
            }}
          >
            {caption}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

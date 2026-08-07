import { Children, Fragment, type ReactNode } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { CaretRightIcon } from 'phosphor-react-native/src/icons/CaretRight';
import { colors, fonts, radii, space, type } from '@/ui/tokens';

const SEPARATOR = Platform.OS === 'ios' ? '#C6C6C8' : colors.line;
const ROW_PRESS = Platform.OS === 'ios' ? '#D1D1D6' : colors.accentSoft;

/** iOS-style inset grouped list container. */
export function InsetGroup({
  children,
  /** Divider inset — use ~56 when rows have leading icons. */
  dividerInset = 56,
}: {
  children: ReactNode;
  dividerInset?: number;
}) {
  const items = Children.toArray(children).filter(Boolean);
  return (
    <View
      style={{
        backgroundColor: colors.bgElevated,
        borderRadius: Platform.OS === 'ios' ? 10 : radii.lg,
        borderCurve: 'continuous',
        overflow: 'hidden',
        // Settings groups sit on grouped gray — border reads as web.
        ...(Platform.OS === 'ios'
          ? null
          : { borderWidth: 1, borderColor: colors.line }),
      }}
    >
      {items.map((child, i) => (
        <Fragment key={i}>
          {i > 0 ? (
            <View
              style={{
                height: StyleSheetHairline,
                backgroundColor: SEPARATOR,
                marginLeft: dividerInset,
              }}
            />
          ) : null}
          {child}
        </Fragment>
      ))}
    </View>
  );
}

const StyleSheetHairline = Platform.select({ ios: 1 / 3, default: 1 }) ?? 1;

export function ListRow({
  title,
  subtitle,
  icon,
  onPress,
  disabled,
  accessory,
  destructive,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  accessory?: ReactNode;
  destructive?: boolean;
}) {
  const body = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.md,
        paddingVertical: 14,
        paddingHorizontal: space.lg,
        minHeight: 56,
        opacity: disabled ? 0.45 : 1,
      }}
    >
      {icon ? (
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            borderCurve: 'continuous',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: destructive
              ? 'rgba(220,38,38,0.1)'
              : colors.accentSoft,
          }}
        >
          {icon}
        </View>
      ) : null}
      <View style={{ flex: 1, gap: 2 }}>
        <Text
          style={
            Platform.OS === 'ios'
              ? {
                  fontSize: 17,
                  fontWeight: '400',
                  letterSpacing: -0.2,
                  color: destructive ? colors.danger : colors.ink,
                }
              : {
                  ...type.body,
                  fontFamily: fonts.medium,
                  color: destructive ? colors.danger : colors.ink,
                }
          }
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={
              Platform.OS === 'ios'
                ? {
                    fontSize: 13,
                    color: '#8E8E93',
                    lineHeight: 18,
                  }
                : { ...type.caption, color: colors.inkFaint }
            }
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      {accessory ??
        (onPress ? (
          <CaretRightIcon size={16} color={colors.inkFaint} weight="bold" />
        ) : null)}
    </View>
  );

  if (!onPress) return body;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: pressed ? ROW_PRESS : 'transparent',
      })}
    >
      {body}
    </Pressable>
  );
}

export function SectionHeader({
  title,
  action,
}: {
  title: string;
  action?: { label: string; onPress: () => void };
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        paddingHorizontal: Platform.OS === 'ios' ? 16 : 4,
        marginBottom: 6,
      }}
    >
      <Text
        style={{
          fontSize: 13,
          fontWeight: '400',
          color: Platform.OS === 'ios' ? '#6D6D72' : colors.inkFaint,
          textTransform: 'uppercase',
          letterSpacing: 0.2,
        }}
      >
        {title}
      </Text>
      {action ? (
        <Pressable onPress={action.onPress} hitSlop={8}>
          <Text
            style={{
              fontSize: 15,
              fontWeight: '400',
              color: colors.accent,
            }}
          >
            {action.label}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

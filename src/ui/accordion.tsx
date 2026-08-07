import { useEffect, useState, type ReactNode } from 'react';
import { LayoutAnimation, Platform, Pressable, Text, UIManager, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { CaretDownIcon } from 'phosphor-react-native/src/icons/CaretDown';
import { colors, fonts, radii, space, type } from '@/ui/tokens';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export type AccordionItem = {
  id: string;
  title: string;
  body: string;
};

type AccordionProps = {
  items: AccordionItem[];
  /** Open the first item by default. */
  defaultOpenId?: string | null;
  /** Allow multiple rows open at once. Default: false. */
  allowMultiple?: boolean;
};

function AccordionRow({
  item,
  open,
  onToggle,
  isLast,
}: {
  item: AccordionItem;
  open: boolean;
  onToggle: () => void;
  isLast: boolean;
}) {
  const spin = useSharedValue(open ? 1 : 0);

  useEffect(() => {
    spin.value = withTiming(open ? 1 : 0, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });
  }, [open, spin]);

  const caretStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value * 180}deg` }],
  }));

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={onToggle}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.md,
          paddingVertical: 16,
          paddingHorizontal: space.lg,
          opacity: pressed ? 0.72 : 1,
        })}
      >
        <Text
          style={{
            ...type.body,
            flex: 1,
            fontFamily: fonts.semibold,
            color: colors.ink,
            letterSpacing: -0.2,
          }}
        >
          {item.title}
        </Text>
        <Animated.View style={caretStyle}>
          <CaretDownIcon
            size={18}
            color={open ? colors.accent : colors.inkFaint}
            weight="bold"
          />
        </Animated.View>
      </Pressable>

      {open ? (
        <View
          style={{
            paddingHorizontal: space.lg,
            paddingBottom: 16,
            paddingTop: 0,
          }}
        >
          <Text
            style={{
              ...type.body,
              color: colors.inkMuted,
              lineHeight: 24,
            }}
          >
            {item.body}
          </Text>
        </View>
      ) : null}

      {!isLast ? (
        <View
          style={{
            height: 1,
            backgroundColor: colors.line,
            marginLeft: space.lg,
          }}
        />
      ) : null}
    </View>
  );
}

/** Grouped accordion — one open at a time by default. */
export function Accordion({
  items,
  defaultOpenId = null,
  allowMultiple = false,
}: AccordionProps) {
  const [openIds, setOpenIds] = useState<string[]>(() =>
    defaultOpenId ? [defaultOpenId] : [],
  );

  const toggle = (id: string) => {
    LayoutAnimation.configureNext(
      LayoutAnimation.create(
        220,
        LayoutAnimation.Types.easeInEaseOut,
        LayoutAnimation.Properties.opacity,
      ),
    );
    setOpenIds((prev) => {
      const isOpen = prev.includes(id);
      if (allowMultiple) {
        return isOpen ? prev.filter((x) => x !== id) : [...prev, id];
      }
      return isOpen ? [] : [id];
    });
  };

  return (
    <View
      style={{
        backgroundColor: colors.bgElevated,
        borderRadius: radii.lg,
        borderCurve: 'continuous',
        borderWidth: 1,
        borderColor: colors.line,
        overflow: 'hidden',
      }}
    >
      {items.map((item, i) => (
        <AccordionRow
          key={item.id}
          item={item}
          open={openIds.includes(item.id)}
          onToggle={() => toggle(item.id)}
          isLast={i === items.length - 1}
        />
      ))}
    </View>
  );
}

/** Soft callout for legal / liability notes. */
export function DisclaimerCallout({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <View
      style={{
        borderRadius: radii.lg,
        borderCurve: 'continuous',
        backgroundColor: 'rgba(220, 38, 38, 0.06)',
        borderWidth: 1,
        borderColor: 'rgba(220, 38, 38, 0.18)',
        padding: space.lg,
        gap: 6,
      }}
    >
      <Text
        style={{
          ...type.caption,
          fontFamily: fonts.semibold,
          color: colors.danger,
          textTransform: 'uppercase',
          letterSpacing: 0.6,
        }}
      >
        {title}
      </Text>
      <Text style={{ ...type.body, color: colors.inkMuted, lineHeight: 22 }}>
        {children}
      </Text>
    </View>
  );
}

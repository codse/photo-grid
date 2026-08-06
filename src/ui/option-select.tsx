import { useEffect, useState, type ComponentType } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import type { IconProps } from 'phosphor-react-native';
import { CaretDownIcon } from 'phosphor-react-native/src/icons/CaretDown';
import { CheckIcon } from 'phosphor-react-native/src/icons/Check';
import { colors, fonts, radii, space, type } from '@/ui/tokens';

export type SelectOption = {
  id: string;
  label: string;
  detail?: string;
  Icon?: ComponentType<IconProps>;
};

type Props = {
  value: string;
  options: SelectOption[];
  onChange: (id: string) => void;
  accessibilityLabel: string;
};

function OptionIcon({
  Icon,
  selected,
  size = 18,
}: {
  Icon?: ComponentType<IconProps>;
  selected?: boolean;
  size?: number;
}) {
  if (!Icon) return null;
  return (
    <Icon
      size={size}
      color={selected ? '#fff' : colors.accent}
      weight={selected ? 'fill' : 'duotone'}
    />
  );
}

/**
 * Compact dropdown for lists longer than a few chips.
 * Trigger + modal menu (works on web + native).
 */
export function OptionSelect({
  value,
  options,
  onChange,
  accessibilityLabel,
}: Props) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.id === value) ?? options[0];
  const { height: winH } = useWindowDimensions();

  useEffect(() => {
    if (!open || Platform.OS !== 'web') return;
    if (typeof window.addEventListener !== 'function') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <View collapsable={false}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(true)}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.sm,
          paddingVertical: 12,
          paddingHorizontal: 14,
          borderRadius: radii.md,
          borderCurve: 'continuous',
          backgroundColor: colors.bgElevated,
          borderWidth: 1,
          borderColor: open ? colors.accent : colors.line,
          opacity: pressed ? 0.9 : 1,
        })}
      >
        {selected?.Icon ? (
          <View style={{ width: 22, alignItems: 'center' }}>
            <OptionIcon Icon={selected.Icon} size={18} />
          </View>
        ) : null}
        <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
          <Text
            numberOfLines={1}
            style={{
              ...type.body,
              fontFamily: fonts.medium,
              color: colors.ink,
              fontSize: 15,
            }}
          >
            {selected?.label ?? 'Select'}
          </Text>
          {selected?.detail ? (
            <Text
              numberOfLines={1}
              style={{ ...type.caption, color: colors.inkFaint }}
            >
              {selected.detail}
            </Text>
          ) : null}
        </View>
        <CaretDownIcon size={16} color={colors.inkMuted} weight="bold" />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          accessibilityLabel="Dismiss"
          onPress={() => setOpen(false)}
          style={{
            flex: 1,
            backgroundColor: 'rgba(42, 33, 28, 0.28)',
            justifyContent: 'center',
            padding: space.xl,
          }}
        >
          <View
            style={{
              maxHeight: Math.min(winH * 0.7, 480),
              backgroundColor: colors.bgElevated,
              borderRadius: radii.lg,
              borderCurve: 'continuous',
              borderWidth: 1,
              borderColor: colors.line,
              overflow: 'hidden',
              boxShadow: '0 16px 40px rgba(28,27,25,0.18)',
            }}
          >
            <View
              style={{
                paddingHorizontal: space.lg,
                paddingVertical: space.md,
                borderBottomWidth: 1,
                borderBottomColor: colors.line,
              }}
            >
              <Text
                style={{
                  ...type.caption,
                  color: colors.inkFaint,
                  textTransform: 'uppercase',
                  letterSpacing: 0.8,
                }}
              >
                {accessibilityLabel}
              </Text>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled">
              {options.map((opt) => {
                const isOn = opt.id === value;
                return (
                  <Pressable
                    key={opt.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isOn }}
                    onPress={() => {
                      onChange(opt.id);
                      setOpen(false);
                    }}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: space.md,
                      paddingVertical: 12,
                      paddingHorizontal: space.lg,
                      backgroundColor: isOn
                        ? colors.accentSoft
                        : pressed
                          ? 'rgba(0,0,0,0.03)'
                          : 'transparent',
                    })}
                  >
                    {opt.Icon ? (
                      <View style={{ width: 22, alignItems: 'center' }}>
                        <opt.Icon
                          size={18}
                          color={colors.accent}
                          weight={isOn ? 'fill' : 'duotone'}
                        />
                      </View>
                    ) : null}
                    <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
                      <Text
                        style={{
                          ...type.body,
                          fontFamily: fonts.medium,
                          color: colors.ink,
                          fontSize: 15,
                        }}
                      >
                        {opt.label}
                      </Text>
                      {opt.detail ? (
                        <Text
                          style={{ ...type.caption, color: colors.inkFaint }}
                        >
                          {opt.detail}
                        </Text>
                      ) : null}
                    </View>
                    {isOn ? (
                      <CheckIcon size={18} color={colors.accent} weight="bold" />
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

/** Chips when ≤3 options, dropdown otherwise. */
export function ChoiceList({
  value,
  options,
  onChange,
  accessibilityLabel,
}: {
  value: string;
  options: SelectOption[];
  onChange: (id: string) => void;
  accessibilityLabel: string;
}) {
  if (options.length > 3) {
    return (
      <OptionSelect
        value={value}
        options={options}
        onChange={onChange}
        accessibilityLabel={accessibilityLabel}
      />
    );
  }

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
      {options.map((opt) => {
        const selected = opt.id === value;
        return (
          <Pressable
            key={opt.id}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(opt.id)}
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
            <OptionIcon Icon={opt.Icon} selected={selected} size={16} />
            <Text
              style={{
                ...type.caption,
                color: selected ? '#fff' : colors.ink,
              }}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

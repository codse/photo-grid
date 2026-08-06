import { Pressable, Text, View } from 'react-native';
import { colors, radii, space, type } from '@/ui/tokens';

type Props = {
  label: string;
  valueMm: number;
  onChange: (mm: number) => void;
  min: number;
  max: number;
  step?: number;
};

export function MmStepper({
  label,
  valueMm,
  onChange,
  min,
  max,
  step = 0.5,
}: Props) {
  const dec = () => onChange(Math.max(min, valueMm - step));
  const inc = () => onChange(Math.min(max, valueMm + step));

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: space.md,
      }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ ...type.body, color: colors.ink }}>{label}</Text>
        <Text style={{ ...type.caption, color: colors.inkFaint }}>
          {valueMm.toFixed(1)} mm
        </Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Decrease ${label}`}
          disabled={valueMm <= min}
          onPress={dec}
          style={({ pressed }) => [
            stepperBtn,
            {
              opacity: valueMm <= min ? 0.4 : pressed ? 0.75 : 1,
            },
          ]}
        >
          <Text style={stepperLabel}>−</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Increase ${label}`}
          disabled={valueMm >= max}
          onPress={inc}
          style={({ pressed }) => [
            stepperBtn,
            {
              opacity: valueMm >= max ? 0.4 : pressed ? 0.75 : 1,
            },
          ]}
        >
          <Text style={stepperLabel}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const stepperBtn = {
  width: 40,
  height: 40,
  borderRadius: radii.sm,
  borderCurve: 'continuous' as const,
  backgroundColor: colors.accentSoft,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
};

const stepperLabel = {
  fontSize: 22,
  color: colors.accent,
  fontWeight: '600' as const,
};

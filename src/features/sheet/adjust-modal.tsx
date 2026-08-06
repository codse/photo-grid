import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import Slider from '@react-native-community/slider';
import {
  Canvas,
  ColorMatrix,
  Image as SkImage,
  useImage,
} from '@shopify/react-native-skia';
import {
  adjustColorMatrix,
  clampAdjustValue,
  cssFilter,
  hasAdjustments,
} from '@/core/adjust-filter';
import { DEFAULT_ADJUST, type Adjustments } from '@/core/types';
import { Button } from '@/ui/primitives';
import { colors, fonts, radii, space, type } from '@/ui/tokens';

type Props = {
  visible: boolean;
  uri: string;
  value: Adjustments;
  onChange: (next: Adjustments) => void;
  onClose: () => void;
};

export function AdjustModal({
  visible,
  uri,
  value,
  onChange,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();
  const { width: winW, height: winH } = useWindowDimensions();
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    if (visible) setDraft(value);
  }, [visible, value]);

  const setField = (key: keyof Adjustments, n: number) => {
    setDraft((d) => ({ ...d, [key]: clampAdjustValue(n) }));
  };

  const previewW = Math.min(winW - 48, 420);
  const previewH = Math.min(previewW * 1.25, winH * 0.38);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: colors.bg,
          paddingTop: Math.max(insets.top, space.xl),
          paddingBottom: Math.max(insets.bottom, space.xl),
          paddingHorizontal: space.xl,
          gap: space.lg,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Text style={{ ...type.title, color: colors.ink }}>Adjust</Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <Text style={{ ...type.caption, color: colors.inkMuted }}>Close</Text>
          </Pressable>
        </View>

        <Text style={{ ...type.caption, color: colors.inkMuted }}>
          Slide to tweak tone. Changes apply to the print sheet.
        </Text>

        <View
          style={{
            alignSelf: 'center',
            width: previewW,
            height: previewH,
            borderRadius: radii.md,
            borderCurve: 'continuous',
            overflow: 'hidden',
            backgroundColor: colors.line,
            borderWidth: 1,
            borderColor: colors.line,
          }}
        >
          <AdjustPreview
            uri={uri}
            adjust={draft}
            width={previewW}
            height={previewH}
          />
        </View>

        <View style={{ gap: space.lg, flex: 1 }}>
          <AdjustSlider
            label="Brightness"
            value={draft.brightness}
            onChange={(n) => setField('brightness', n)}
          />
          <AdjustSlider
            label="Contrast"
            value={draft.contrast}
            onChange={(n) => setField('contrast', n)}
          />
          <AdjustSlider
            label="Color"
            value={draft.saturation}
            onChange={(n) => setField('saturation', n)}
          />
        </View>

        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <View style={{ flex: 1 }}>
            <Button
              label="Reset"
              variant="secondary"
              onPress={() => setDraft({ ...DEFAULT_ADJUST })}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              label="Done"
              onPress={() => {
                onChange(draft);
                onClose();
              }}
            />
          </View>
        </View>

        {hasAdjustments(draft) ? (
          <Text
            style={{
              ...type.caption,
              color: colors.inkFaint,
              textAlign: 'center',
            }}
          >
            Adjusted · some agencies prefer unedited photos
          </Text>
        ) : null}
      </View>
    </Modal>
  );
}

function AdjustPreview({
  uri,
  adjust,
  width,
  height,
}: {
  uri: string;
  adjust: Adjustments;
  width: number;
  height: number;
}) {
  if (Platform.OS === 'web') {
    return (
      <Image
        source={{ uri }}
        style={
          {
            width,
            height,
            filter: cssFilter(adjust),
          } as never
        }
        contentFit="cover"
      />
    );
  }
  return (
    <NativeAdjustPreview
      uri={uri}
      adjust={adjust}
      width={width}
      height={height}
    />
  );
}

function NativeAdjustPreview({
  uri,
  adjust,
  width,
  height,
}: {
  uri: string;
  adjust: Adjustments;
  width: number;
  height: number;
}) {
  const image = useImage(uri);
  const matrix = useMemo(() => adjustColorMatrix(adjust), [adjust]);
  if (!image) {
    return <View style={{ width, height, backgroundColor: colors.line }} />;
  }
  return (
    <Canvas style={{ width, height }}>
      <SkImage image={image} x={0} y={0} width={width} height={height} fit="cover">
        <ColorMatrix matrix={matrix} />
      </SkImage>
    </Canvas>
  );
}

function AdjustSlider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  const pct = Math.round((value - 1) * 100);
  const labelValue =
    pct === 0 ? 'Normal' : pct > 0 ? `+${pct}%` : `${pct}%`;

  return (
    <View style={{ gap: space.sm }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Text
          style={{ ...type.body, fontFamily: fonts.medium, color: colors.ink }}
        >
          {label}
        </Text>
        <Text style={{ ...type.caption, color: colors.inkMuted }}>
          {labelValue}
        </Text>
      </View>
      <Slider
        minimumValue={0.4}
        maximumValue={1.8}
        step={0.01}
        value={value}
        onValueChange={onChange}
        minimumTrackTintColor={colors.accent}
        maximumTrackTintColor={colors.line}
        thumbTintColor={colors.accent}
        accessibilityLabel={label}
        style={{ width: '100%', height: 36 }}
      />
    </View>
  );
}

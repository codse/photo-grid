import { useMemo } from 'react';
import { Platform, View } from 'react-native';
import { Image } from 'expo-image';
import {
  Canvas,
  ColorMatrix,
  Group,
  Image as SkImage,
  useImage,
} from '@shopify/react-native-skia';
import {
  adjustColorMatrix,
  cssFilter,
  hasAdjustments,
} from '@/core/adjust-filter';
import { coverDisplayLayout } from '@/core/crop-math';
import type { Adjustments, CropState } from '@/core/types';
import { normalizeCrop } from '@/core/types';
import { colors } from '@/ui/tokens';

type Props = {
  uri: string;
  imgW: number;
  imgH: number;
  frameW: number;
  frameH: number;
  crop: CropState;
  adjust?: Adjustments;
  pointerEvents?: 'none' | 'auto' | 'box-none' | 'box-only';
};

type Layout = ReturnType<typeof coverDisplayLayout>;

function CroppedBitmap({
  uri,
  layout,
  filter,
  pointerEvents = 'none',
}: {
  uri: string;
  layout: Layout;
  filter?: string;
  pointerEvents?: Props['pointerEvents'];
}) {
  return (
    <View
      pointerEvents={pointerEvents}
      style={{
        width: layout.displayW,
        height: layout.displayH,
        transform: [
          { translateX: layout.translateX },
          { translateY: layout.translateY },
        ],
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View
        style={{
          width: layout.preRotateW,
          height: layout.preRotateH,
          transform: [
            { rotate: `${layout.rotation}deg` },
            { scaleX: layout.flipH ? -1 : 1 },
          ],
        }}
      >
        <Image
          source={{ uri }}
          style={
            {
              width: '100%',
              height: '100%',
              ...(filter ? { filter } : {}),
            } as never
          }
          contentFit="fill"
        />
      </View>
    </View>
  );
}

/**
 * Image inside a crop frame — pan/zoom/rotate/flip match export; tone matches Adjust.
 * Transform translates (not absolute left/top) so expo-image paints reliably.
 */
export function AdjustedCropImage({
  uri,
  imgW,
  imgH,
  frameW,
  frameH,
  crop,
  adjust,
  pointerEvents = 'none',
}: Props) {
  const c = normalizeCrop(crop);
  const layout = useMemo(
    () => coverDisplayLayout(imgW, imgH, frameW, frameH, c),
    [
      imgW,
      imgH,
      frameW,
      frameH,
      c.offsetX,
      c.offsetY,
      c.zoom,
      c.rotation,
      c.flipH,
    ],
  );

  if (imgW <= 0 || imgH <= 0 || frameW <= 0 || frameH <= 0) {
    return (
      <View
        style={{
          width: frameW,
          height: frameH,
          backgroundColor: colors.line,
        }}
      />
    );
  }

  if (Platform.OS !== 'web' && adjust && hasAdjustments(adjust)) {
    return (
      <NativeAdjustedCrop
        uri={uri}
        layout={layout}
        frameW={frameW}
        frameH={frameH}
        adjust={adjust}
        pointerEvents={pointerEvents}
      />
    );
  }

  const filter =
    Platform.OS === 'web' && adjust && hasAdjustments(adjust)
      ? cssFilter(adjust)
      : undefined;

  return (
    <CroppedBitmap
      uri={uri}
      layout={layout}
      filter={filter}
      pointerEvents={pointerEvents}
    />
  );
}

function NativeAdjustedCrop({
  uri,
  layout,
  frameW,
  frameH,
  adjust,
  pointerEvents,
}: {
  uri: string;
  layout: Layout;
  frameW: number;
  frameH: number;
  adjust: Adjustments;
  pointerEvents?: Props['pointerEvents'];
}) {
  const image = useImage(uri);
  const matrix = useMemo(() => adjustColorMatrix(adjust), [adjust]);

  // Skia URI load can lag — show expo-image until ready (filters apply when Skia loads).
  if (!image) {
    return (
      <CroppedBitmap uri={uri} layout={layout} pointerEvents={pointerEvents} />
    );
  }

  const cx = layout.translateX + layout.displayW / 2;
  const cy = layout.translateY + layout.displayH / 2;

  return (
    <Canvas style={{ width: frameW, height: frameH }} pointerEvents="none">
      <Group
        transform={[
          { translateX: cx },
          { translateY: cy },
          { rotate: (layout.rotation * Math.PI) / 180 },
          { scaleX: layout.flipH ? -1 : 1 },
        ]}
      >
        <SkImage
          image={image}
          x={-layout.preRotateW / 2}
          y={-layout.preRotateH / 2}
          width={layout.preRotateW}
          height={layout.preRotateH}
          fit="fill"
        >
          <ColorMatrix matrix={matrix} />
        </SkImage>
      </Group>
    </Canvas>
  );
}

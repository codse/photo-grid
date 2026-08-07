import { useEffect, useMemo, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { CroppedImagePreview } from '@/features/sheet/cropped-image-preview';
import type { SheetLayout, Subject } from '@/core/types';
import type { ImageSource } from '@/platform/render-sheet';
import { colors, radii } from '@/ui/tokens';

type Props = {
  layout: SheetLayout;
  subjects: Subject[];
  images: Map<string, ImageSource>;
  previewW: number;
  previewH: number;
  cutGuides: boolean;
  packMode: 'fill' | 'exact';
  gapMm: number;
  marginMm: number;
  orientation: 'auto' | 'portrait' | 'landscape';
  wide?: boolean;
};

/**
 * Holds a paper veil until baked previews (or fallbacks) are ready, then fades
 * the grid in once — avoids cell-by-cell flicker as each previewUri lands.
 */
export function SheetPreview({
  layout,
  subjects,
  images,
  previewW,
  previewH,
  cutGuides,
  packMode,
  gapMm,
  marginMm,
  orientation,
  wide,
}: Props) {
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(reduceMotion ? 1 : 0);
  const [forceReady, setForceReady] = useState(false);
  /** Freeze subjects at reveal so late bakes don't swap Cropped → Image mid-view. */
  const [frozen, setFrozen] = useState<Subject[] | null>(null);

  const withPhotos = useMemo(
    () => subjects.filter((s) => s.url),
    [subjects],
  );

  const layoutSig = useMemo(
    () =>
      [
        layout.paperWidthMm,
        layout.paperHeightMm,
        layout.rotated ? 1 : 0,
        layout.cells.length,
        packMode,
        gapMm,
        marginMm,
        orientation,
        cutGuides ? 1 : 0,
        withPhotos
          .map((s) => {
            const c = s.crop;
            const a = s.adjust;
            return [
              s.id,
              s.url,
              s.widthMm,
              s.heightMm,
              c.offsetX,
              c.offsetY,
              c.zoom,
              c.rotation,
              c.flipH ? 1 : 0,
              a.brightness,
              a.contrast,
              a.saturation,
            ].join(':');
          })
          .join(','),
      ].join('|'),
    [
      layout.paperWidthMm,
      layout.paperHeightMm,
      layout.rotated,
      layout.cells.length,
      packMode,
      gapMm,
      marginMm,
      orientation,
      cutGuides,
      withPhotos,
    ],
  );

  const allBaked =
    withPhotos.length === 0 || withPhotos.every((s) => !!s.previewUri);
  const fallbacksOk =
    withPhotos.length === 0 ||
    withPhotos.every((s) => !!s.previewUri || images.has(s.id));
  const ready = allBaked || (forceReady && fallbacksOk);

  // New layout / people → hide until ready again.
  useEffect(() => {
    setForceReady(false);
    setFrozen(null);
    if (reduceMotion) {
      opacity.value = 1;
      return;
    }
    opacity.value = 0;
    const t = setTimeout(() => setForceReady(true), 1800);
    return () => clearTimeout(t);
  }, [layoutSig, opacity, reduceMotion]);

  useEffect(() => {
    if (!ready || frozen) return;
    setFrozen(subjects.map((s) => ({ ...s })));
    if (reduceMotion) {
      opacity.value = 1;
      return;
    }
    opacity.value = withTiming(1, {
      duration: 380,
      easing: Easing.out(Easing.cubic),
    });
  }, [ready, frozen, subjects, opacity, reduceMotion]);

  const contentStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const veilStyle = useAnimatedStyle(() => ({
    opacity: 1 - opacity.value,
  }));

  const displaySubjects = frozen ?? subjects;

  return (
    <View
      style={{
        alignSelf: wide ? 'flex-start' : 'center',
        width: previewW,
        height: previewH,
        backgroundColor: colors.paper,
        borderRadius: radii.sm,
        borderCurve: 'continuous',
        borderWidth: 1,
        borderColor: colors.line,
        overflow: 'hidden',
        ...(Platform.OS === 'web'
          ? { boxShadow: '0 8px 24px rgba(28,27,25,0.08)' }
          : null),
      }}
    >
      <Animated.View style={[{ flex: 1 }, contentStyle]}>
        {layout.cells.map((cell) => {
          const img = images.get(cell.subjectId);
          const subject = displaySubjects.find((s) => s.id === cell.subjectId);
          const left = (cell.xMm / layout.paperWidthMm) * previewW;
          const top = (cell.yMm / layout.paperHeightMm) * previewH;
          const w = (cell.widthMm / layout.paperWidthMm) * previewW;
          const h = (cell.heightMm / layout.paperHeightMm) * previewH;
          const previewUri = subject?.previewUri;
          return (
            <View
              key={cell.id}
              style={{
                position: 'absolute',
                left,
                top,
                width: w,
                height: h,
                borderWidth: cutGuides ? 1 : 0,
                borderColor: 'rgba(0,0,0,0.2)',
                overflow: 'hidden',
                backgroundColor: colors.line,
              }}
            >
              {previewUri ? (
                <Image
                  source={{ uri: previewUri }}
                  style={{ width: w, height: h }}
                  contentFit="cover"
                  recyclingKey={previewUri}
                />
              ) : img ? (
                <CroppedImagePreview
                  uri={img.uri}
                  imgW={img.width}
                  imgH={img.height}
                  width={w}
                  height={h}
                  crop={cell.crop}
                  adjust={subject?.adjust}
                />
              ) : null}
            </View>
          );
        })}
      </Animated.View>

      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, veilStyle]}
      >
        <View style={styles.veil}>
          {layout.cells.map((cell) => {
            const left = (cell.xMm / layout.paperWidthMm) * previewW;
            const top = (cell.yMm / layout.paperHeightMm) * previewH;
            const w = (cell.widthMm / layout.paperWidthMm) * previewW;
            const h = (cell.heightMm / layout.paperHeightMm) * previewH;
            return (
              <View
                key={`veil-${cell.id}`}
                style={{
                  position: 'absolute',
                  left,
                  top,
                  width: w,
                  height: h,
                  borderRadius: 2,
                  backgroundColor: 'rgba(184, 149, 63, 0.12)',
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: colors.line,
                }}
              />
            );
          })}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  veil: {
    flex: 1,
    backgroundColor: colors.paper,
  },
});

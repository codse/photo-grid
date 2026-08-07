import { useEffect, useRef } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import type { Adjustments, CropState } from '@/core/types';
import { DEFAULT_CROP, normalizeCrop } from '@/core/types';
import { cssFilter, hasAdjustments } from '@/core/adjust-filter';
import { orientedSize } from '@/core/crop-math';
import { colors, radii, space, type } from '@/ui/tokens';

const ZOOM_MIN = 1;
const ZOOM_MAX = 4;
const ZOOM_STEP = 0.1;
const WHEEL_STEP = 0.05;

type Props = {
  uri: string;
  imgW: number;
  imgH: number;
  aspect: number;
  crop: CropState;
  adjust?: Adjustments;
  onChange: (crop: CropState) => void;
};

/**
 * Crop frame — pan/pinch on UI thread. Rotate/flip are metadata (instant).
 */
export function CropCanvas({
  uri,
  imgW,
  imgH,
  aspect,
  crop,
  adjust,
  onChange,
}: Props) {
  const { width: winW } = useWindowDimensions();
  const frameW = Math.min(winW - 48, 360);
  const frameH = frameW / aspect;
  const c = normalizeCrop(crop);
  const { w: logicalW, h: logicalH } = orientedSize(imgW, imgH, c.rotation);

  const zoom = useSharedValue(c.zoom);
  const offsetX = useSharedValue(c.offsetX);
  const offsetY = useSharedValue(c.offsetY);
  const pinchStart = useSharedValue(c.zoom);
  const cropRef = useRef(c);
  cropRef.current = c;
  const frameRef = useRef<View>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    zoom.value = c.zoom;
    offsetX.value = c.offsetX;
    offsetY.value = c.offsetY;
  }, [c.zoom, c.offsetX, c.offsetY, c.rotation, c.flipH, offsetX, offsetY, zoom]);

  const commit = (z: number, ox: number, oy: number) => {
    onChangeRef.current({
      ...cropRef.current,
      zoom: z,
      offsetX: ox,
      offsetY: oy,
    });
  };

  const nudgeZoom = (delta: number) => {
    const next = clamp(c.zoom + delta, ZOOM_MIN, ZOOM_MAX);
    zoom.value = next;
    onChange({ ...c, zoom: next });
  };

  const pan = Gesture.Pan()
    .averageTouches(true)
    .maxPointers(1)
    .onChange((e) => {
      'worklet';
      const coverScale =
        Math.max(frameW / logicalW, frameH / logicalH) * zoom.value;
      const sw = frameW / coverScale;
      const sh = frameH / coverScale;
      const maxOx = Math.max(0, logicalW - sw);
      const maxOy = Math.max(0, logicalH - sh);
      if (maxOx === 0 && maxOy === 0) return;
      const dSx = -e.changeX / coverScale;
      const dSy = -e.changeY / coverScale;
      if (maxOx > 0) {
        offsetX.value = clamp((offsetX.value * maxOx + dSx) / maxOx, 0, 1);
      }
      if (maxOy > 0) {
        offsetY.value = clamp((offsetY.value * maxOy + dSy) / maxOy, 0, 1);
      }
    })
    .onEnd(() => {
      'worklet';
      runOnJS(commit)(zoom.value, offsetX.value, offsetY.value);
    });

  const pinch = Gesture.Pinch()
    .onBegin(() => {
      'worklet';
      pinchStart.value = zoom.value;
    })
    .onUpdate((e) => {
      'worklet';
      zoom.value = clamp(pinchStart.value * e.scale, ZOOM_MIN, ZOOM_MAX);
    })
    .onEnd(() => {
      'worklet';
      runOnJS(commit)(zoom.value, offsetX.value, offsetY.value);
    });

  const composed = Gesture.Simultaneous(pan, pinch);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const node = frameRef.current as unknown as HTMLElement | null;
    if (!node?.addEventListener) return;

    let middleDragging = false;
    let lastX = 0;
    let lastY = 0;

    const applyPan = (dx: number, dy: number) => {
      const coverScale =
        Math.max(frameW / logicalW, frameH / logicalH) * zoom.value;
      const sw = frameW / coverScale;
      const sh = frameH / coverScale;
      const maxOx = Math.max(0, logicalW - sw);
      const maxOy = Math.max(0, logicalH - sh);
      if (maxOx === 0 && maxOy === 0) return;
      const dSx = -dx / coverScale;
      const dSy = -dy / coverScale;
      if (maxOx > 0) {
        offsetX.value = clamp((offsetX.value * maxOx + dSx) / maxOx, 0, 1);
      }
      if (maxOy > 0) {
        offsetY.value = clamp((offsetY.value * maxOy + dSy) / maxOy, 0, 1);
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -WHEEL_STEP : WHEEL_STEP;
      const next = clamp(zoom.value + delta, ZOOM_MIN, ZOOM_MAX);
      zoom.value = next;
      commit(next, offsetX.value, offsetY.value);
    };

    const onDragStart = (e: DragEvent) => e.preventDefault();

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 1) return;
      e.preventDefault();
      middleDragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      node.setPointerCapture?.(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!middleDragging) return;
      e.preventDefault();
      applyPan(e.clientX - lastX, e.clientY - lastY);
      lastX = e.clientX;
      lastY = e.clientY;
    };

    const endMiddle = (e: PointerEvent) => {
      if (!middleDragging) return;
      if (e.button === 1 || e.type === 'pointerup' || e.type === 'pointercancel') {
        middleDragging = false;
        commit(zoom.value, offsetX.value, offsetY.value);
        try {
          node.releasePointerCapture?.(e.pointerId);
        } catch {
          /* ignore */
        }
      }
    };

    const onAuxClick = (e: MouseEvent) => {
      if (e.button === 1) e.preventDefault();
    };

    node.style.touchAction = 'none';
    node.style.userSelect = 'none';

    node.addEventListener('wheel', onWheel, { passive: false });
    node.addEventListener('dragstart', onDragStart);
    node.addEventListener('pointerdown', onPointerDown);
    node.addEventListener('pointermove', onPointerMove);
    node.addEventListener('pointerup', endMiddle);
    node.addEventListener('pointercancel', endMiddle);
    node.addEventListener('auxclick', onAuxClick);

    return () => {
      node.removeEventListener('wheel', onWheel);
      node.removeEventListener('dragstart', onDragStart);
      node.removeEventListener('pointerdown', onPointerDown);
      node.removeEventListener('pointermove', onPointerMove);
      node.removeEventListener('pointerup', endMiddle);
      node.removeEventListener('pointercancel', endMiddle);
      node.removeEventListener('auxclick', onAuxClick);
    };
  }, [logicalW, logicalH, frameW, frameH, zoom, offsetX, offsetY]);

  const boxStyle = useAnimatedStyle(() => {
    const coverScale =
      Math.max(frameW / logicalW, frameH / logicalH) * zoom.value;
    const displayW = logicalW * coverScale;
    const displayH = logicalH * coverScale;
    const maxOx = Math.max(0, displayW - frameW);
    const maxOy = Math.max(0, displayH - frameH);
    return {
      position: 'absolute' as const,
      left: -offsetX.value * maxOx,
      top: -offsetY.value * maxOy,
      width: displayW,
      height: displayH,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    };
  }, [frameW, frameH, logicalW, logicalH]);

  const imgStyle = useAnimatedStyle(() => {
    const coverScale =
      Math.max(frameW / logicalW, frameH / logicalH) * zoom.value;
    const displayW = logicalW * coverScale;
    const displayH = logicalH * coverScale;
    const swapped = c.rotation === 90 || c.rotation === 270;
    return {
      width: swapped ? displayH : displayW,
      height: swapped ? displayW : displayH,
      transform: [
        { rotate: `${c.rotation}deg` },
        { scaleX: c.flipH ? -1 : 1 },
      ],
    };
  }, [frameW, frameH, logicalW, logicalH, c.rotation, c.flipH]);

  const atMin = c.zoom <= ZOOM_MIN + 0.001;
  const atMax = c.zoom >= ZOOM_MAX - 0.001;
  const filter =
    Platform.OS === 'web' && adjust && hasAdjustments(adjust)
      ? cssFilter(adjust)
      : undefined;

  return (
    <View style={{ alignItems: 'center', gap: space.md }}>
      <View ref={frameRef} collapsable={false}>
        <GestureDetector gesture={composed}>
          <Animated.View
            style={{
              width: frameW,
              height: frameH,
              borderRadius: radii.md,
              borderCurve: 'continuous',
              overflow: 'hidden',
              backgroundColor: colors.line,
              borderWidth: 1,
              borderColor: colors.line,
            }}
          >
            <Animated.View style={boxStyle}>
              <Animated.View style={imgStyle}>
                <Image
                  source={{ uri }}
                  pointerEvents="none"
                  style={
                    {
                      width: '100%',
                      height: '100%',
                      ...(filter ? { filter } : {}),
                    } as never
                  }
                  contentFit="fill"
                />
              </Animated.View>
            </Animated.View>
            <View pointerEvents="none" style={StyleSheet.absoluteFill}>
              <View
                style={{
                  position: 'absolute',
                  left: '22%',
                  right: '22%',
                  top: '14%',
                  bottom: '28%',
                  borderWidth: 1.5,
                  borderColor: 'rgba(184,149,63,0.55)',
                  borderRadius: 999,
                }}
              />
            </View>
          </Animated.View>
        </GestureDetector>
      </View>

      <View
        style={{
          width: frameW,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: space.sm,
        }}
      >
        <ZoomButton
          label="−"
          accessibilityLabel="Zoom out"
          disabled={atMin}
          onPress={() => nudgeZoom(-ZOOM_STEP)}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Reset crop"
          onPress={() => onChange({ ...DEFAULT_CROP })}
          hitSlop={8}
          style={{ paddingVertical: 8, paddingHorizontal: 12 }}
        >
          <Text style={{ ...type.caption, color: colors.accent }}>Reset</Text>
        </Pressable>
        <ZoomButton
          label="+"
          accessibilityLabel="Zoom in"
          disabled={atMax}
          onPress={() => nudgeZoom(ZOOM_STEP)}
        />
      </View>
    </View>
  );
}

function clamp(n: number, a: number, b: number) {
  'worklet';
  return Math.max(a, Math.min(b, n));
}

function ZoomButton({
  label,
  accessibilityLabel,
  disabled,
  onPress,
}: {
  label: string;
  accessibilityLabel: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        borderRadius: radii.sm,
        borderCurve: 'continuous',
        backgroundColor: colors.accentSoft,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.4 : pressed ? 0.75 : 1,
      })}
    >
      <Text
        style={{
          ...type.title,
          color: colors.accent,
          fontSize: 24,
          lineHeight: 28,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

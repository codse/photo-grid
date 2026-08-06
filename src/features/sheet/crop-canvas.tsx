import { createElement, useEffect, useMemo, useRef } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS } from 'react-native-reanimated';
import { Image } from 'expo-image';
import type { CropState } from '@/core/types';
import { DEFAULT_CROP } from '@/core/types';
import { clampZoom, panCropByPixels } from '@/core/crop-math';
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
  onChange: (crop: CropState) => void;
};

export function CropCanvas({
  uri,
  imgW,
  imgH,
  aspect,
  crop,
  onChange,
}: Props) {
  const { width: winW } = useWindowDimensions();
  const frameW = Math.min(winW - 48, 360);
  const frameH = frameW / aspect;
  const cropRef = useRef(crop);
  cropRef.current = crop;
  const pinchBaseRef = useRef(crop.zoom);
  const frameRef = useRef<View>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const setZoom = (zoom: number) => {
    const c = cropRef.current;
    onChangeRef.current({ ...c, zoom: clampZoom(zoom) });
  };

  const nudgeZoom = (delta: number) => {
    setZoom(cropRef.current.zoom + delta);
  };

  const handlePan = (dx: number, dy: number) => {
    const c = cropRef.current;
    onChange(panCropByPixels(c, imgW, imgH, frameW, frameH, dx, dy));
  };

  const beginPinch = () => {
    pinchBaseRef.current = cropRef.current.zoom;
  };

  const handlePinchZoom = (factor: number) => {
    const c = cropRef.current;
    onChange({
      ...c,
      zoom: clampZoom(pinchBaseRef.current * factor),
    });
  };

  const pan = Gesture.Pan()
    .averageTouches(true)
    .onChange((e) => {
      runOnJS(handlePan)(e.changeX, e.changeY);
    });

  const pinch = Gesture.Pinch()
    .onBegin(() => {
      runOnJS(beginPinch)();
    })
    .onUpdate((e) => {
      runOnJS(handlePinchZoom)(e.scale);
    });

  const composed = Gesture.Simultaneous(pan, pinch);

  // Web: wheel zoom, middle-mouse pan, kill native image drag / autoscroll.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const node = frameRef.current as unknown as HTMLElement | null;
    if (!node?.addEventListener) return;

    let middleDragging = false;
    let lastX = 0;
    let lastY = 0;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -WHEEL_STEP : WHEEL_STEP;
      const c = cropRef.current;
      onChangeRef.current({
        ...c,
        zoom: clampZoom(c.zoom + delta),
      });
    };

    const onDragStart = (e: DragEvent) => {
      e.preventDefault();
    };

    const onPointerDown = (e: PointerEvent) => {
      // Middle button
      if (e.button !== 1) return;
      e.preventDefault();
      middleDragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      node.setPointerCapture?.(e.pointerId);
      node.style.cursor = 'grabbing';
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!middleDragging) return;
      e.preventDefault();
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      const c = cropRef.current;
      onChangeRef.current(
        panCropByPixels(c, imgW, imgH, frameW, frameH, dx, dy),
      );
    };

    const endMiddle = (e: PointerEvent) => {
      if (!middleDragging) return;
      if (e.button === 1 || e.type === 'pointerup' || e.type === 'pointercancel') {
        middleDragging = false;
        node.style.cursor = 'grab';
        try {
          node.releasePointerCapture?.(e.pointerId);
        } catch {
          /* ignore */
        }
      }
    };

    const onAuxClick = (e: MouseEvent) => {
      // Stop middle-click paste / default browser actions
      if (e.button === 1) e.preventDefault();
    };

    node.style.cursor = 'grab';
    node.style.touchAction = 'none';
    node.style.userSelect = 'none';
    (node.style as CSSStyleDeclaration & { webkitUserDrag?: string }).webkitUserDrag =
      'none';

    // Kill ghost-image drag on nested <img>
    const imgs = node.querySelectorAll?.('img') ?? [];
    imgs.forEach((img) => {
      img.setAttribute('draggable', 'false');
      img.addEventListener('dragstart', onDragStart);
    });

    node.addEventListener('wheel', onWheel, { passive: false });
    node.addEventListener('dragstart', onDragStart);
    node.addEventListener('pointerdown', onPointerDown);
    node.addEventListener('pointermove', onPointerMove);
    node.addEventListener('pointerup', endMiddle);
    node.addEventListener('pointercancel', endMiddle);
    node.addEventListener('auxclick', onAuxClick);

    return () => {
      imgs.forEach((img) => img.removeEventListener('dragstart', onDragStart));
      node.removeEventListener('wheel', onWheel);
      node.removeEventListener('dragstart', onDragStart);
      node.removeEventListener('pointerdown', onPointerDown);
      node.removeEventListener('pointermove', onPointerMove);
      node.removeEventListener('pointerup', endMiddle);
      node.removeEventListener('pointercancel', endMiddle);
      node.removeEventListener('auxclick', onAuxClick);
    };
  }, [imgW, imgH, frameW, frameH]);

  const coverScale = useMemo(() => {
    return Math.max(frameW / imgW, frameH / imgH) * crop.zoom;
  }, [frameW, frameH, imgW, imgH, crop.zoom]);

  const displayW = imgW * coverScale;
  const displayH = imgH * coverScale;
  const maxOx = Math.max(0, displayW - frameW);
  const maxOy = Math.max(0, displayH - frameH);
  const tx = -crop.offsetX * maxOx;
  const ty = -crop.offsetY * maxOy;

  const atMin = crop.zoom <= ZOOM_MIN + 0.001;
  const atMax = crop.zoom >= ZOOM_MAX - 0.001;

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
            <Image
              source={{ uri }}
              pointerEvents="none"
              style={{
                width: displayW,
                height: displayH,
                transform: [{ translateX: tx }, { translateY: ty }],
              }}
              contentFit="fill"
            />
            <View pointerEvents="none" style={StyleSheet.absoluteFill}>
              <View
                style={{
                  position: 'absolute',
                  left: '22%',
                  right: '22%',
                  top: '14%',
                  bottom: '28%',
                  borderWidth: 1.5,
                  borderColor: 'rgba(255,107,53,0.55)',
                  borderRadius: 999,
                }}
              />
            </View>
          </Animated.View>
        </GestureDetector>
      </View>

      <View style={{ width: frameW, gap: space.sm }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: space.sm,
          }}
        >
          <Text style={{ ...type.caption, color: colors.inkMuted }}>
            Zoom {crop.zoom.toFixed(2)}×
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Reset crop"
            onPress={() => onChange({ ...DEFAULT_CROP })}
            hitSlop={8}
          >
            <Text style={{ ...type.caption, color: colors.accent }}>Reset</Text>
          </Pressable>
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: space.sm,
          }}
        >
          <ZoomButton
            label="−"
            accessibilityLabel="Zoom out"
            disabled={atMin}
            onPress={() => nudgeZoom(-ZOOM_STEP)}
          />
          <View style={{ flex: 1, justifyContent: 'center' }}>
            {Platform.OS === 'web' ? (
              <WebZoomSlider value={crop.zoom} onChange={setZoom} />
            ) : (
              <View
                style={{
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: colors.line,
                  overflow: 'hidden',
                }}
              >
                <View
                  style={{
                    height: '100%',
                    width: `${((crop.zoom - ZOOM_MIN) / (ZOOM_MAX - ZOOM_MIN)) * 100}%`,
                    backgroundColor: colors.accent,
                    borderRadius: 3,
                  }}
                />
              </View>
            )}
          </View>
          <ZoomButton
            label="+"
            accessibilityLabel="Zoom in"
            disabled={atMax}
            onPress={() => nudgeZoom(ZOOM_STEP)}
          />
        </View>
      </View>
    </View>
  );
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

function WebZoomSlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (zoom: number) => void;
}) {
  return (
    <View style={{ height: 28, justifyContent: 'center' }}>
      {createElement('input', {
        type: 'range',
        min: ZOOM_MIN,
        max: ZOOM_MAX,
        step: 0.01,
        value,
        'aria-label': 'Zoom',
        onChange: (e: { target: { value: string } }) =>
          onChange(Number(e.target.value)),
        style: {
          width: '100%',
          margin: 0,
          accentColor: colors.accent,
          cursor: 'pointer',
        },
      })}
    </View>
  );
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  Camera,
  getCameraDevice,
  useCameraDevices,
  useCameraFormat,
  useCameraPermission,
  type CameraDevice,
  type CameraPosition,
} from 'react-native-vision-camera';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import Slider from '@react-native-community/slider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraRotateIcon } from 'phosphor-react-native/src/icons/CameraRotate';
import { SunIcon } from 'phosphor-react-native/src/icons/Sun';
import { pickFromCamera } from '@/platform/media';
import type { CameraCaptureProps } from '@/platform/camera-types';
import { colors, fonts, radii, space, type } from '@/ui/tokens';

export type { CameraCaptureProps };

type LensOption = { id: string; label: string; zoom: number };

function lensOptionsFor(device: CameraDevice): LensOption[] {
  const opts: LensOption[] = [];
  const phys = device.physicalDevices;
  if (phys.includes('ultra-wide-angle-camera')) {
    opts.push({ id: 'uw', label: '0.5', zoom: device.minZoom });
  }
  opts.push({ id: 'wide', label: '1×', zoom: device.neutralZoom });
  if (phys.includes('telephoto-camera')) {
    const tele = Math.min(device.maxZoom, device.neutralZoom * 2);
    if (tele > device.neutralZoom * 1.2) {
      opts.push({ id: 'tele', label: '2×', zoom: tele });
    }
  }
  return opts;
}

function pickDevice(
  devices: CameraDevice[],
  position: CameraPosition,
): CameraDevice | undefined {
  // Prefer multi-cam so 0.5 / 1 / 2 lens switching is smooth via zoom.
  return (
    getCameraDevice(devices, position, {
      physicalDevices: [
        'ultra-wide-angle-camera',
        'wide-angle-camera',
        'telephoto-camera',
      ],
    }) ??
    getCameraDevice(devices, position, {
      physicalDevices: ['ultra-wide-angle-camera', 'wide-angle-camera'],
    }) ??
    getCameraDevice(devices, position, {
      physicalDevices: ['wide-angle-camera'],
    }) ??
    getCameraDevice(devices, position)
  );
}

/** Native — Vision Camera preview with flip, lenses, tap-focus, exposure. */
export function CameraCapture({ onCaptured, onCancel }: CameraCaptureProps) {
  const insets = useSafeAreaInsets();
  const devices = useCameraDevices();
  const { hasPermission, requestPermission } = useCameraPermission();
  const cameraRef = useRef<Camera>(null);

  const [position, setPosition] = useState<CameraPosition>('front');
  const [zoom, setZoom] = useState(1);
  const [exposure, setExposure] = useState(0);
  const [busy, setBusy] = useState(false);
  const [readyWait, setReadyWait] = useState(true);
  const [active, setActive] = useState(true);
  const [focusUI, setFocusUI] = useState<{ x: number; y: number } | null>(null);

  const hasFront = useMemo(
    () => devices.some((d) => d.position === 'front'),
    [devices],
  );
  const hasBack = useMemo(
    () => devices.some((d) => d.position === 'back'),
    [devices],
  );

  const device = useMemo(
    () => pickDevice(devices, position),
    [devices, position],
  );

  const format = useCameraFormat(device, [
    { photoResolution: 'max' },
    { videoResolution: 'max' },
  ]);

  const lenses = useMemo(
    () => (device ? lensOptionsFor(device) : []),
    [device],
  );

  // Reset zoom + exposure when device/position changes.
  useEffect(() => {
    if (!device) return;
    setZoom(device.neutralZoom);
    setExposure(0);
  }, [device?.id]);

  useEffect(() => {
    setActive(true);
    return () => setActive(false);
  }, []);

  useEffect(() => {
    if (hasPermission) return;
    void requestPermission();
  }, [hasPermission, requestPermission]);

  useEffect(() => {
    if (!hasPermission) {
      setReadyWait(true);
      return;
    }
    if (device) {
      setReadyWait(false);
      return;
    }
    const t = setTimeout(() => setReadyWait(false), 1200);
    return () => clearTimeout(t);
  }, [hasPermission, device]);

  // Hide focus reticle after a beat.
  useEffect(() => {
    if (!focusUI) return;
    const t = setTimeout(() => setFocusUI(null), 900);
    return () => clearTimeout(t);
  }, [focusUI]);

  const focusAt = useCallback(
    (x: number, y: number) => {
      const cam = cameraRef.current;
      if (!cam || !device?.supportsFocus) return;
      setFocusUI({ x, y });
      void cam.focus({ x, y }).catch(() => {
        // focus can fail mid-switch; ignore
      });
    },
    [device?.supportsFocus],
  );

  const tapGesture = useMemo(
    () =>
      Gesture.Tap().onEnd(({ x, y }) => {
        runOnJS(focusAt)(x, y);
      }),
    [focusAt],
  );

  const flip = useCallback(() => {
    setPosition((p) => {
      if (p === 'front' && hasBack) return 'back';
      if (p === 'back' && hasFront) return 'front';
      return p;
    });
  }, [hasBack, hasFront]);

  const take = useCallback(async () => {
    if (!cameraRef.current || busy) return;
    setBusy(true);
    try {
      const photo = await cameraRef.current.takePhoto({
        flash: 'off',
        enableShutterSound: true,
      });
      const uri = photo.path.startsWith('file://')
        ? photo.path
        : `file://${photo.path}`;
      onCaptured({
        uri,
        sourceName: `camera-${new Date()
          .toISOString()
          .slice(0, 19)
          .replace(/[:T]/g, '-')}.jpg`,
      });
    } catch {
      const img = await pickFromCamera();
      if (img) {
        onCaptured({
          uri: img.uri,
          sourceName: img.fileName ?? img.uri,
        });
      }
    } finally {
      setBusy(false);
    }
  }, [busy, onCaptured]);

  const openSystemCamera = useCallback(async () => {
    setBusy(true);
    try {
      const img = await pickFromCamera();
      if (img) {
        onCaptured({
          uri: img.uri,
          sourceName: img.fileName ?? img.uri,
        });
      }
    } finally {
      setBusy(false);
    }
  }, [onCaptured]);

  if (!hasPermission) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Camera access</Text>
        <Text style={styles.body}>
          Passport Photo Print needs the camera to take passport photos on-device.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => void requestPermission()}
          style={styles.primary}
        >
          <Text style={styles.primaryLabel}>Allow camera</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => void openSystemCamera()}
          style={styles.secondary}
        >
          <Text style={styles.secondaryLabel}>Use system camera</Text>
        </Pressable>
        <Pressable onPress={onCancel} style={styles.ghost}>
          <Text style={styles.ghostLabel}>Cancel</Text>
        </Pressable>
      </View>
    );
  }

  if (readyWait && !device) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
        <Text style={styles.body}>Starting camera…</Text>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Camera unavailable</Text>
        <Text style={styles.body}>
          Vision Camera couldn’t find a device. You can still use the system
          camera.
        </Text>
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => void openSystemCamera()}
          style={styles.primary}
        >
          <Text style={styles.primaryLabel}>
            {busy ? 'Opening…' : 'Open system camera'}
          </Text>
        </Pressable>
        <Pressable onPress={onCancel} style={styles.ghost}>
          <Text style={styles.ghostLabel}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const canFlip = hasFront && hasBack;
  const exposureRange = device.maxExposure - device.minExposure;
  const showExposure = exposureRange > 0.01;

  return (
    <View style={styles.fill}>
      <GestureDetector gesture={tapGesture}>
        <View style={StyleSheet.absoluteFill}>
          <Camera
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            device={device}
            format={format}
            isActive={active}
            photo
            photoQualityBalance="quality"
            zoom={zoom}
            exposure={exposure}
            enableZoomGesture={false}
          />
          {focusUI ? (
            <View
              pointerEvents="none"
              style={[
                styles.focusReticle,
                {
                  left: focusUI.x - 28,
                  top: focusUI.y - 28,
                },
              ]}
            />
          ) : null}
        </View>
      </GestureDetector>

      <View
        style={[
          styles.overlay,
          {
            // Leave room for the transparent stack header (close X)
            paddingTop: Math.max(insets.top, 12) + 52,
            paddingBottom: Math.max(insets.bottom, 16) + 8,
          },
        ]}
        pointerEvents="box-none"
      >
        <View style={styles.mid} pointerEvents="box-none">
          <View style={styles.guide} pointerEvents="none" />

          {showExposure ? (
            <View style={styles.exposureWrap} pointerEvents="box-none">
              <SunIcon size={16} color="rgba(255,255,255,0.9)" weight="fill" />
              <View style={styles.exposureSliderBox}>
                <Slider
                  style={styles.exposureSlider}
                  minimumValue={device.minExposure}
                  maximumValue={device.maxExposure}
                  step={0.05}
                  value={exposure}
                  onValueChange={setExposure}
                  minimumTrackTintColor="#fff"
                  maximumTrackTintColor="rgba(255,255,255,0.35)"
                  thumbTintColor={colors.accent}
                  accessibilityLabel="Exposure"
                />
              </View>
            </View>
          ) : null}
        </View>

        <View style={styles.bottom} pointerEvents="box-none">
          {lenses.length > 1 ? (
            <View style={styles.lensRow}>
              {lenses.map((lens) => {
                const selected = Math.abs(zoom - lens.zoom) < 0.05;
                return (
                  <Pressable
                    key={lens.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`${lens.label} lens`}
                    onPress={() => setZoom(lens.zoom)}
                    style={[styles.lensChip, selected && styles.lensChipOn]}
                  >
                    <Text
                      style={[styles.lensLabel, selected && styles.lensLabelOn]}
                    >
                      {lens.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          <View style={styles.bar}>
            <View style={styles.barSide} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Take photo"
              onPress={() => void take()}
              disabled={busy}
              style={[styles.shutter, busy ? { opacity: 0.5 } : null]}
            />
            <View style={styles.barSide}>
              {canFlip ? (
                <Pressable
                  onPress={flip}
                  style={styles.iconBtn}
                  accessibilityRole="button"
                  accessibilityLabel={
                    position === 'front'
                      ? 'Switch to back camera'
                      : 'Switch to front camera'
                  }
                >
                  <CameraRotateIcon size={22} color="#fff" weight="bold" />
                </Pressable>
              ) : null}
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#000' },
  center: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: 'center',
    padding: space.xl,
    gap: space.md,
  },
  title: { ...type.title, color: colors.ink },
  body: { ...type.body, color: colors.inkMuted },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'space-between',
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  mid: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guide: {
    width: '62%',
    aspectRatio: 35 / 45,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.7)',
    borderRadius: radii.md,
    borderCurve: 'continuous',
  },
  focusReticle: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderWidth: 1.5,
    borderColor: colors.accent,
    borderRadius: 4,
  },
  exposureWrap: {
    position: 'absolute',
    right: 8,
    top: '18%',
    bottom: '18%',
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  exposureSliderBox: {
    flex: 1,
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exposureSlider: {
    width: 180,
    height: 40,
    transform: [{ rotate: '-90deg' }],
  },
  bottom: {
    gap: space.md,
    paddingHorizontal: space.xl,
  },
  lensRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  lensChip: {
    minWidth: 44,
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  lensChipOn: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderColor: '#fff',
  },
  lensLabel: {
    color: '#fff',
    fontFamily: fonts.semibold,
    fontSize: 13,
    fontWeight: '600',
  },
  lensLabelOn: {
    color: '#111',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  barSide: {
    width: 72,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  shutter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#fff',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  primary: {
    backgroundColor: colors.accent,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: radii.md,
    borderCurve: 'continuous',
    alignItems: 'center',
  },
  primaryLabel: { color: '#fff', fontWeight: '600', fontSize: 16 },
  secondary: {
    backgroundColor: colors.accentSoft,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: radii.md,
    borderCurve: 'continuous',
    alignItems: 'center',
  },
  secondaryLabel: { color: colors.accent, fontWeight: '600', fontSize: 16 },
  ghost: { padding: 12 },
  ghostLabel: { color: colors.inkMuted, fontWeight: '600' },
});

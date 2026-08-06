import { useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
} from 'react-native-vision-camera';
import { colors, radii, space, type } from '@/ui/tokens';

type Props = {
  onCaptured: (result: { uri: string; sourceName?: string }) => void;
  onCancel: () => void;
};

export function CameraCapture({ onCaptured, onCancel }: Props) {
  const front = useCameraDevice('front');
  const back = useCameraDevice('back');
  const device = front ?? back;
  const { hasPermission, requestPermission } = useCameraPermission();
  const cameraRef = useRef<Camera>(null);
  const [busy, setBusy] = useState(false);

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
    } finally {
      setBusy(false);
    }
  }, [busy, onCaptured]);

  if (!hasPermission) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Camera access</Text>
        <Text style={styles.body}>
          Passport Photo Print needs the camera to take passport photos on-device.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={requestPermission}
          style={styles.primary}
        >
          <Text style={styles.primaryLabel}>Allow camera</Text>
        </Pressable>
        <Pressable onPress={onCancel} style={styles.ghost}>
          <Text style={styles.ghostLabel}>Cancel</Text>
        </Pressable>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>No camera</Text>
        <Pressable onPress={onCancel} style={styles.ghost}>
          <Text style={styles.ghostLabel}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.fill}>
      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive
        photo
        photoQualityBalance="quality"
      />
      <View style={styles.overlay} pointerEvents="box-none">
        <View style={styles.guide} />
        <View style={styles.bar}>
          <Pressable onPress={onCancel} style={styles.ghostLight}>
            <Text style={styles.ghostLightLabel}>Cancel</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Take photo"
            onPress={take}
            disabled={busy}
            style={styles.shutter}
          />
          <View style={{ width: 72 }} />
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
    ...StyleSheet.absoluteFill,
    justifyContent: 'space-between',
    paddingBottom: 40,
    paddingTop: 60,
  },
  guide: {
    alignSelf: 'center',
    width: '62%',
    aspectRatio: 35 / 45,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.7)',
    borderRadius: radii.md,
    borderCurve: 'continuous',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.xl,
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
  ghost: { padding: 12 },
  ghostLabel: { color: colors.inkMuted, fontWeight: '600' },
  ghostLight: { padding: 12 },
  ghostLightLabel: { color: '#fff', fontWeight: '600' },
});

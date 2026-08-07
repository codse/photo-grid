import {
  createElement,
  useCallback,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
} from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { CameraRotateIcon } from 'phosphor-react-native/src/icons/CameraRotate';
import { pickFromLibrary } from '@/platform/media';
import type { CameraCaptureProps } from '@/platform/camera-types';
import { colors, space, type } from '@/ui/tokens';

export type { CameraCaptureProps };

type Facing = 'user' | 'environment';

function CameraVideo({
  stream,
  mirrored,
  style,
  videoRef,
}: {
  stream: MediaStream;
  mirrored: boolean;
  style?: StyleProp<ViewStyle>;
  videoRef: MutableRefObject<HTMLVideoElement | null>;
}) {
  return createElement('video', {
    ref: (el: HTMLVideoElement | null) => {
      videoRef.current = el;
      if (el && el.srcObject !== stream) {
        el.srcObject = stream;
        void el.play().catch(() => undefined);
      }
    },
    autoPlay: true,
    playsInline: true,
    muted: true,
    style: {
      ...(StyleSheet.flatten(style) as object),
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      transform: mirrored ? 'scaleX(-1)' : undefined,
    },
  });
}

/**
 * Live getUserMedia camera for web (not the ImagePicker file dialog).
 */
export function CameraCapture({ onCaptured, onCancel }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<Facing>('user');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(true);
  const [busy, setBusy] = useState(false);
  const [hasFront, setHasFront] = useState(false);
  const [hasBack, setHasBack] = useState(false);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStream(null);
  }, []);

  const start = useCallback(
    async (nextFacing: Facing) => {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        setError('Camera isn’t available in this browser.');
        setStarting(false);
        return;
      }
      setStarting(true);
      setError(null);
      stopStream();
      try {
        const media = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: nextFacing },
            width: { ideal: 1920 },
            height: { ideal: 1440 },
          },
        });
        streamRef.current = media;
        setStream(media);
        setFacing(nextFacing);
      } catch (e) {
        const name = e instanceof DOMException ? e.name : '';
        if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
          setError('Camera permission denied. Allow access or pick a photo instead.');
        } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
          setError('No camera found on this device.');
        } else {
          setError(e instanceof Error ? e.message : 'Could not start camera');
        }
      } finally {
        setStarting(false);
      }
    },
    [stopStream],
  );

  useEffect(() => {
    void (async () => {
      try {
        const devices = await navigator.mediaDevices?.enumerateDevices?.();
        const videos = devices?.filter((d) => d.kind === 'videoinput') ?? [];
        // Without labels (pre-permission) assume both; refine after grant.
        setHasFront(videos.length !== 1);
        setHasBack(videos.length !== 1);
        if (videos.length === 1) {
          setHasFront(true);
          setHasBack(false);
        }
      } catch {
        setHasFront(true);
        setHasBack(true);
      }
      await start('user');
    })();
    return () => stopStream();
  }, [start, stopStream]);

  const flip = useCallback(() => {
    void start(facing === 'user' ? 'environment' : 'user');
  }, [facing, start]);

  const take = useCallback(async () => {
    const video = videoRef.current;
    if (!video || busy || video.videoWidth === 0) return;
    setBusy(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not capture frame');
      // Preview is mirrored for selfie UX; capture stays unmirrored (true ID photo).
      ctx.drawImage(video, 0, 0);
      const uri = canvas.toDataURL('image/jpeg', 0.95);
      stopStream();
      onCaptured({
        uri,
        sourceName: `camera-${new Date()
          .toISOString()
          .slice(0, 19)
          .replace(/[:T]/g, '-')}.jpg`,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not take photo');
      setBusy(false);
    }
  }, [busy, onCaptured, stopStream]);

  const useLibrary = useCallback(async () => {
    setBusy(true);
    try {
      const img = await pickFromLibrary();
      if (!img) return;
      stopStream();
      onCaptured({
        uri: img.uri,
        sourceName: img.fileName ?? img.uri,
      });
    } finally {
      setBusy(false);
    }
  }, [onCaptured, stopStream]);

  if (starting && !stream) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
        <Text style={styles.body}>Starting camera…</Text>
      </View>
    );
  }

  if (!stream) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Camera</Text>
        <Text style={styles.body}>{error ?? 'Camera unavailable'}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => void start('user')}
          style={styles.primary}
        >
          <Text style={styles.primaryLabel}>Try again</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => void useLibrary()}
          style={styles.secondary}
        >
          <Text style={styles.secondaryLabel}>
            {busy ? 'Opening…' : 'Choose from library'}
          </Text>
        </Pressable>
        <Pressable onPress={onCancel} style={styles.ghost}>
          <Text style={styles.ghostLabel}>Cancel</Text>
        </Pressable>
      </View>
    );
  }

  const canFlip = hasFront && hasBack;

  return (
    <View style={styles.fill}>
      <View style={StyleSheet.absoluteFill}>
        <CameraVideo
          stream={stream}
          mirrored={facing === 'user'}
          style={StyleSheet.absoluteFill}
          videoRef={videoRef}
        />
      </View>

      <View style={styles.overlay} pointerEvents="box-none">
        <View style={styles.mid} pointerEvents="none">
          <View style={styles.guide} />
        </View>

        <View style={styles.bottom} pointerEvents="box-none">
          {error ? (
            <Text style={styles.errorBanner}>{error}</Text>
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
                    facing === 'user'
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
  title: {
    ...type.title,
    color: colors.ink,
  },
  body: {
    ...type.body,
    color: colors.inkMuted,
  },
  primary: {
    marginTop: space.sm,
    backgroundColor: colors.accent,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryLabel: {
    ...type.body,
    color: '#fff',
    fontWeight: '600',
  },
  secondary: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: colors.accentSoft,
  },
  secondaryLabel: {
    ...type.body,
    color: colors.accent,
    fontWeight: '600',
  },
  ghost: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  ghostLabel: {
    ...type.body,
    color: colors.inkMuted,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    // Web camera is a 4:5 overlay card with an in-frame close control.
    paddingTop: Platform.OS === 'web' ? 52 : 64,
    paddingBottom: 28,
  },
  mid: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guide: {
    width: '62%',
    aspectRatio: 35 / 45,
    maxHeight: '78%',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.55)',
    borderRadius: 8,
  },
  bottom: {
    gap: 12,
    paddingHorizontal: 20,
  },
  errorBanner: {
    ...type.caption,
    color: '#fff',
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    padding: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  barSide: {
    width: 52,
    alignItems: 'center',
  },
  shutter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#fff',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
});

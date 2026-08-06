import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { CameraType } from 'expo-image-picker';
import { pickFromCamera, pickFromLibrary } from '@/platform/media';
import type { CameraCaptureProps } from '@/platform/camera-types';
import { colors, space, type } from '@/ui/tokens';

export type { CameraCaptureProps };

/**
 * Web fallback if `/camera` is opened directly.
 * Prefer calling `pickFromCamera` from the originating button (user gesture).
 */
export function CameraCapture({ onCaptured, onCancel }: CameraCaptureProps) {
  const started = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void (async () => {
      try {
        const img =
          (await pickFromCamera(CameraType.front)) ??
          (await pickFromLibrary());
        if (!img) {
          onCancel();
          return;
        }
        onCaptured({
          uri: img.uri,
          sourceName: img.fileName ?? img.uri,
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not open camera');
        onCancel();
      }
    })();
  }, [onCaptured, onCancel]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.bg,
        justifyContent: 'center',
        alignItems: 'center',
        padding: space.xl,
        gap: space.md,
      }}
    >
      <ActivityIndicator color={colors.accent} />
      <Text style={{ ...type.body, color: colors.inkMuted, textAlign: 'center' }}>
        {error ?? 'Opening…'}
      </Text>
    </View>
  );
}

import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { pickFromCamera, pickFromLibrary } from '@/platform/media';
import { colors, radii, space, type } from '@/ui/tokens';

type Props = {
  onCaptured: (result: { uri: string; sourceName?: string }) => void;
  onCancel: () => void;
};

/** Web twin — system camera/library (getUserMedia stills via picker). */
export function CameraCapture({ onCaptured, onCancel }: Props) {
  const [busy, setBusy] = useState(false);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.bg,
        justifyContent: 'center',
        padding: space.xl,
        gap: space.md,
      }}
    >
      <Text style={{ ...type.title, color: colors.ink }}>Take a photo</Text>
      <Text style={{ ...type.body, color: colors.inkMuted }}>
        On web we use the browser/system camera. For Vision Camera, run a native
        iOS/Android build.
      </Text>
      <Pressable
        accessibilityRole="button"
        disabled={busy}
        onPress={async () => {
          setBusy(true);
          try {
            const img = (await pickFromCamera()) ?? (await pickFromLibrary());
            if (img) {
              onCaptured({
                uri: img.uri,
                sourceName: img.fileName ?? img.uri,
              });
            }
          } finally {
            setBusy(false);
          }
        }}
        style={{
          backgroundColor: colors.accent,
          paddingVertical: 14,
          borderRadius: radii.md,
          borderCurve: 'continuous',
          alignItems: 'center',
        }}
      >
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>
            Open camera
          </Text>
        )}
      </Pressable>
      <Pressable onPress={onCancel} style={{ padding: 12, alignItems: 'center' }}>
        <Text style={{ color: colors.inkMuted, fontWeight: '600' }}>Cancel</Text>
      </Pressable>
    </View>
  );
}

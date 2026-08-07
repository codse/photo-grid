import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { XIcon } from 'phosphor-react-native/src/icons/X';
import { CameraCapture } from '@/platform/camera';
import { preparePersonImage } from '@/platform/media';
import { useActivePerson, useSession } from '@/state/session';

const isWeb = Platform.OS === 'web';

function leaveCamera() {
  const {
    pendingCapturePersonId,
    subjects,
    removePerson,
    setPendingCapturePersonId,
  } = useSession.getState();
  if (pendingCapturePersonId) {
    const person = subjects.find((s) => s.id === pendingCapturePersonId);
    setPendingCapturePersonId(null);
    if (person && !person.url && subjects.length > 1) {
      removePerson(pendingCapturePersonId);
    }
  }
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace('/');
  }
}

function CloseButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel="Close"
      style={styles.closeBtn}
    >
      <XIcon size={20} color="#fff" weight="bold" />
    </Pressable>
  );
}

export default function CameraScreen() {
  const active = useActivePerson();
  const setPersonUri = useSession((s) => s.setPersonUri);

  const capture = (
    <CameraCapture
      onCancel={leaveCamera}
      onCaptured={({ uri, sourceName }) => {
        void (async () => {
          try {
            if (active) {
              const prepared = await preparePersonImage({
                uri,
                width: 0,
                height: 0,
                fileName: sourceName,
              });
              setPersonUri(active.id, prepared.uri, {
                sourceName: prepared.fileName ?? sourceName,
              });
            }
          } catch {
            if (active) {
              setPersonUri(active.id, uri, { sourceName });
            }
          }
          useSession.getState().setPendingCapturePersonId(null);
          router.replace(active ? `/person/${active.id}/crop` : '/photo');
        })();
      }}
    />
  );

  if (isWeb) {
    return (
      <View style={styles.webRoot}>
        <StatusBar style="light" />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss camera"
          onPress={leaveCamera}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.webCard} accessibilityViewIsModal>
          <View style={styles.webClose}>
            <CloseButton onPress={leaveCamera} />
          </View>
          {capture}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.nativeRoot}>
      <StatusBar style="light" />
      <Stack.Screen
        options={{
          title: '',
          presentation: 'fullScreenModal',
          headerTransparent: true,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: 'transparent' },
          headerTintColor: '#fff',
          contentStyle: { backgroundColor: '#000' },
          headerLeft: () => <CloseButton onPress={leaveCamera} />,
        }}
      />
      {capture}
    </View>
  );
}

const styles = StyleSheet.create({
  nativeRoot: {
    flex: 1,
    backgroundColor: '#000',
  },
  webRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    padding: 20,
  },
  webCard: {
    width: '100%',
    maxWidth: 420,
    aspectRatio: 4 / 5,
    backgroundColor: '#000',
    borderRadius: 16,
    overflow: 'hidden',
    // Keep above the dismiss scrim.
    zIndex: 1,
  },
  webClose: {
    position: 'absolute',
    top: 12,
    left: 12,
    zIndex: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
});

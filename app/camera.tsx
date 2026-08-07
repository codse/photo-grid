import { Pressable, View } from 'react-native';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { XIcon } from 'phosphor-react-native/src/icons/X';
import { CameraCapture } from '@/platform/camera';
import { preparePersonImage } from '@/platform/media';
import { useActivePerson, useSession } from '@/state/session';

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
  router.back();
}

export default function CameraScreen() {
  const active = useActivePerson();
  const setPersonUri = useSession((s) => s.setPersonUri);

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
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
          headerLeft: () => (
            <Pressable
              onPress={leaveCamera}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Close"
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(0,0,0,0.35)',
              }}
            >
              <XIcon size={20} color="#fff" weight="bold" />
            </Pressable>
          ),
        }}
      />
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
    </View>
  );
}

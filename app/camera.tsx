import { Pressable, View } from 'react-native';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { XIcon } from 'phosphor-react-native/src/icons/X';
import { CameraCapture } from '@/platform/camera';
import { useActivePerson, useSession } from '@/state/session';

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
              onPress={() => router.back()}
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
        onCancel={() => router.back()}
        onCaptured={({ uri, sourceName }) => {
          if (active) {
            setPersonUri(active.id, uri, { sourceName });
          }
          router.replace(active ? `/person/${active.id}/crop` : '/photo');
        }}
      />
    </View>
  );
}

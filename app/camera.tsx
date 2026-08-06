import { router } from 'expo-router';
import { CameraCapture } from '@/platform/camera';
import { useActivePerson, useSession } from '@/state/session';

export default function CameraScreen() {
  const active = useActivePerson();
  const setPersonUri = useSession((s) => s.setPersonUri);

  return (
    <CameraCapture
      onCancel={() => router.back()}
      onCaptured={({ uri, sourceName }) => {
        if (active) {
          setPersonUri(active.id, uri, { sourceName });
        }
        router.replace(active ? `/person/${active.id}/crop` : '/photo');
      }}
    />
  );
}

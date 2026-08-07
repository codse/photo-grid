import { Redirect } from 'expo-router';
import { RequirePhoto } from '@/features/session/require-photo';
import { useActivePerson } from '@/state/session';

/** Legacy path — crop lives at /person/[id]/crop */
export default function CropRedirect() {
  const active = useActivePerson();
  return (
    <RequirePhoto>
      {active ? (
        <Redirect href={`/person/${active.id}/crop`} />
      ) : (
        <Redirect href="/(tabs)/index" />
      )}
    </RequirePhoto>
  );
}

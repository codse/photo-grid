import type { ReactNode } from 'react';
import { Redirect } from 'expo-router';
import { useSession } from '@/state/session';

/** Mid-flow screens need an in-memory photo — reload empties Zustand. */
export function RequirePhoto({ children }: { children: ReactNode }) {
  const hasPhoto = useSession((s) => s.subjects.some((x) => !!x.url));
  if (!hasPhoto) return <Redirect href="/" />;
  return <>{children}</>;
}

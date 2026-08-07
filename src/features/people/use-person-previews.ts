import { useEffect } from 'react';
import { useSession } from '@/state/session';
import { syncPersonPreviews } from '@/features/people/person-preview-scheduler';

/**
 * Keep baked `previewUri`s fresh. Safe to mount on multiple screens —
 * scheduling is module-singleton (no double bake).
 */
export function usePersonPreviews() {
  const subjects = useSession((s) => s.subjects);

  useEffect(() => {
    syncPersonPreviews(subjects);
  }, [subjects]);
}

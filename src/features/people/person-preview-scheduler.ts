import type { Subject } from '@/core/types';
import { bakePersonPreview } from '@/platform/person-preview';
import { releasePreviewUri } from '@/platform/release-preview-uri';
import { useSession } from '@/state/session';

const DEBOUNCE_MS = 300;
const MAX_CONCURRENT = 1;
/** After a failed bake, wait before retrying the same key. */
const FAIL_COOLDOWN_MS = 8_000;

function bakeKey(s: Subject): string {
  const c = s.crop;
  const a = s.adjust;
  return [
    s.id,
    s.url,
    c.offsetX,
    c.offsetY,
    c.zoom,
    c.rotation,
    c.flipH ? 1 : 0,
    a.brightness,
    a.contrast,
    a.saturation,
    s.widthMm,
    s.heightMm,
  ].join('|');
}

type Pending = { key: string; timer: ReturnType<typeof setTimeout> };

/** Module singleton — safe if crop + sheet both mount the hook. */
const pending = new Map<string, Pending>();
/** id → key currently baking */
const inflight = new Map<string, string>();
const queue: string[] = [];
let activeCount = 0;
const failUntil = new Map<string, number>();

function enqueue(id: string) {
  if (queue.includes(id) || inflight.has(id)) return;
  queue.push(id);
  pump();
}

function pump() {
  while (activeCount < MAX_CONCURRENT && queue.length > 0) {
    const id = queue.shift()!;
    const subject = useSession.getState().subjects.find((s) => s.id === id);
    if (!subject?.url || subject.previewUri) continue;
    const key = bakeKey(subject);
    const cooled = failUntil.get(key) ?? 0;
    const wait = cooled - Date.now();
    if (wait > 0) {
      setTimeout(() => {
        const s = useSession.getState().subjects.find((x) => x.id === id);
        if (s?.url && !s.previewUri) enqueue(id);
      }, wait);
      continue;
    }

    activeCount += 1;
    inflight.set(id, key);
    void (async () => {
      let produced: string | undefined;
      try {
        const latestBefore = useSession
          .getState()
          .subjects.find((s) => s.id === id);
        if (!latestBefore?.url || latestBefore.previewUri) return;
        if (bakeKey(latestBefore) !== key) return;

        produced = await bakePersonPreview(latestBefore);

        const latest = useSession.getState().subjects.find((s) => s.id === id);
        if (!latest?.url || latest.previewUri || bakeKey(latest) !== key) {
          releasePreviewUri(produced);
          return;
        }
        useSession.getState().setPersonPreviewUri(id, produced);
        produced = undefined;
        failUntil.delete(key);
      } catch {
        failUntil.set(key, Date.now() + FAIL_COOLDOWN_MS);
        if (produced) releasePreviewUri(produced);
      } finally {
        inflight.delete(id);
        activeCount -= 1;
        pump();
      }
    })();
  }
}

/**
 * Debounced, deduped, concurrency-limited preview bake into session state.
 * Call whenever subjects may need baking (hook does this).
 */
export function syncPersonPreviews(subjects: Subject[]) {
  const needed = subjects.filter((s) => s.url && !s.previewUri);
  const neededIds = new Set(needed.map((s) => s.id));

  for (const [id, entry] of pending) {
    if (!neededIds.has(id)) {
      clearTimeout(entry.timer);
      pending.delete(id);
    }
  }

  // Drop queued work for people who no longer need a bake.
  for (let i = queue.length - 1; i >= 0; i--) {
    if (!neededIds.has(queue[i]!)) queue.splice(i, 1);
  }

  for (const subject of needed) {
    const key = bakeKey(subject);
    if (inflight.get(subject.id) === key) continue;

    const existing = pending.get(subject.id);
    if (existing?.key === key) continue;
    if (existing) clearTimeout(existing.timer);

    const timer = setTimeout(() => {
      pending.delete(subject.id);
      enqueue(subject.id);
    }, DEBOUNCE_MS);

    pending.set(subject.id, { key, timer });
  }
}

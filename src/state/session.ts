import { create } from 'zustand';
import {
  DEFAULT_PAPER_ID,
  DEFAULT_PHOTO_ID,
  PAPER_PRESETS,
  PHOTO_PRESETS,
} from '@/core/presets';
import { packSubjects } from '@/core/layout';
import {
  DEFAULT_ADJUST,
  DEFAULT_CROP,
  type Adjustments,
  type CropState,
  type Subject,
  uid,
} from '@/core/types';
import type { ConfigSnapshot } from '@/platform/prefs';
import { pushRecentConfig } from '@/platform/prefs';

export type PackMode = 'exact' | 'fill';
export type Orientation = 'auto' | 'portrait' | 'landscape';

type Prefs = {
  photoId: string;
  paperId: string;
  recentConfigs?: ConfigSnapshot[];
};

type SessionState = {
  subjects: Subject[];
  activePersonId: string | null;
  photoId: string;
  paperId: string;
  packMode: PackMode;
  orientation: Orientation;
  gapMm: number;
  marginMm: number;
  cutGuides: boolean;
  prefsHydrated: boolean;
  recentConfigs: ConfigSnapshot[];

  hydratePrefs: (prefs: Prefs) => void;
  setPhotoPreset: (photoId: string) => void;
  setPaperPreset: (paperId: string) => void;
  applyConfig: (config: ConfigSnapshot) => void;
  /** Call after a successful export — only then we remember the combo. */
  recordExportedConfig: () => void;
  setPackMode: (mode: PackMode) => void;
  setOrientation: (o: Orientation) => void;
  setGapMm: (mm: number) => void;
  setMarginMm: (mm: number) => void;
  setCutGuides: (on: boolean) => void;
  setActivePerson: (id: string | null) => void;
  addPerson: () => string;
  removePerson: (id: string) => void;
  duplicatePerson: (id: string) => string | null;
  updatePerson: (id: string, patch: Partial<Subject>) => void;
  setPersonUri: (id: string, uri: string, meta?: { sourceName?: string }) => void;
  replacePersonUri: (id: string, uri: string) => void;
  undoPersonUri: (id: string) => void;
  setPersonCrop: (id: string, crop: CropState) => void;
  setPersonAdjust: (id: string, adjust: Adjustments) => void;
  setPersonCopies: (id: string, copies: number) => void;
  applyCropToAllOfPerson: (id: string) => void;
};

function sizeFromPhotoId(photoId: string) {
  const p = PHOTO_PRESETS.find((x) => x.id === photoId) ?? PHOTO_PRESETS[0];
  return { widthMm: p.widthMm, heightMm: p.heightMm };
}

function clampMm(n: number, min: number, max: number) {
  return Math.round(Math.max(min, Math.min(max, n)) * 10) / 10;
}

function newSubject(label: string, photoId: string, partial?: Partial<Subject>): Subject {
  const size = sizeFromPhotoId(photoId);
  return {
    id: uid('person'),
    label,
    url: '',
    widthMm: size.widthMm,
    heightMm: size.heightMm,
    copies: 4,
    crop: { ...DEFAULT_CROP },
    adjust: { ...DEFAULT_ADJUST },
    ...partial,
  };
}

export function getPaperSize(paperId: string) {
  return PAPER_PRESETS.find((p) => p.id === paperId) ?? PAPER_PRESETS[1];
}

export const useSession = create<SessionState>((set, get) => ({
  subjects: [newSubject('Person 1', DEFAULT_PHOTO_ID)],
  activePersonId: null,
  photoId: DEFAULT_PHOTO_ID,
  paperId: DEFAULT_PAPER_ID,
  packMode: 'fill',
  orientation: 'auto',
  gapMm: 2,
  marginMm: 3,
  cutGuides: true,
  prefsHydrated: false,
  recentConfigs: [],

  hydratePrefs: (prefs) => {
    const size = sizeFromPhotoId(prefs.photoId);
    set((s) => ({
      prefsHydrated: true,
      photoId: prefs.photoId,
      paperId: prefs.paperId,
      recentConfigs: prefs.recentConfigs ?? [],
      subjects: s.subjects.map((sub, i) =>
        i === 0 && !sub.url
          ? { ...sub, widthMm: size.widthMm, heightMm: size.heightMm }
          : sub,
      ),
    }));
  },

  setPhotoPreset: (photoId) => {
    const size = sizeFromPhotoId(photoId);
    set((s) => ({
      photoId,
      subjects: s.subjects.map((sub) =>
        sub.id === (s.activePersonId ?? s.subjects[0]?.id)
          ? { ...sub, widthMm: size.widthMm, heightMm: size.heightMm }
          : sub,
      ),
    }));
  },

  setPaperPreset: (paperId) => set({ paperId }),

  applyConfig: (config) => {
    const size = sizeFromPhotoId(config.photoId);
    set((s) => ({
      photoId: config.photoId,
      paperId: config.paperId,
      subjects: s.subjects.map((sub) =>
        sub.id === (s.activePersonId ?? s.subjects[0]?.id)
          ? { ...sub, widthMm: size.widthMm, heightMm: size.heightMm }
          : sub,
      ),
    }));
  },

  recordExportedConfig: () => {
    const { photoId, paperId, recentConfigs } = get();
    set({
      recentConfigs: pushRecentConfig(recentConfigs, { photoId, paperId }),
    });
  },

  setPackMode: (packMode) => {
    if (packMode === 'exact') {
      // Seed Need N from whatever currently fits so switching isn't a surprise.
      const { subjects, paperId, gapMm, marginMm, orientation } = get();
      const paper = getPaperSize(paperId);
      const layout = packSubjects(subjects, {
        paperWidthMm: paper.widthMm,
        paperHeightMm: paper.heightMm,
        gapMm,
        marginMm,
        orientation,
        mode: 'fill',
      });
      const counts = new Map<string, number>();
      for (const cell of layout.cells) {
        counts.set(cell.subjectId, (counts.get(cell.subjectId) ?? 0) + 1);
      }
      set({
        packMode,
        subjects: subjects.map((sub) => ({
          ...sub,
          copies: Math.max(1, counts.get(sub.id) ?? sub.copies),
        })),
      });
      return;
    }
    set({ packMode });
  },
  setOrientation: (orientation) => set({ orientation }),
  setGapMm: (gapMm) => set({ gapMm: clampMm(gapMm, 0, 20) }),
  setMarginMm: (marginMm) => set({ marginMm: clampMm(marginMm, 0, 30) }),
  setCutGuides: (cutGuides) => set({ cutGuides }),
  setActivePerson: (activePersonId) => set({ activePersonId }),

  addPerson: () => {
    const { subjects, photoId } = get();
    const label = `Person ${subjects.length + 1}`;
    const person = newSubject(label, photoId);
    set({ subjects: [...subjects, person], activePersonId: person.id });
    return person.id;
  },

  removePerson: (id) => {
    const { subjects, activePersonId } = get();
    if (subjects.length <= 1) return;
    const next = subjects.filter((s) => s.id !== id);
    set({
      subjects: next,
      activePersonId:
        activePersonId === id ? (next[0]?.id ?? null) : activePersonId,
    });
  },

  duplicatePerson: (id) => {
    const src = get().subjects.find((s) => s.id === id);
    if (!src) return null;
    const copy: Subject = {
      ...src,
      id: uid('person'),
      label: `${src.label} copy`,
      crop: { ...src.crop },
      adjust: { ...src.adjust },
    };
    set((s) => ({
      subjects: [...s.subjects, copy],
      activePersonId: copy.id,
    }));
    return copy.id;
  },

  updatePerson: (id, patch) =>
    set((s) => ({
      subjects: s.subjects.map((sub) =>
        sub.id === id ? { ...sub, ...patch } : sub,
      ),
    })),

  setPersonUri: (id, uri, meta) =>
    set((s) => ({
      subjects: s.subjects.map((sub) =>
        sub.id === id
          ? {
              ...sub,
              url: uri,
              previousUrl: undefined,
              crop: { ...DEFAULT_CROP },
              ...(meta?.sourceName !== undefined
                ? { sourceName: meta.sourceName }
                : {}),
            }
          : sub,
      ),
      activePersonId: id,
    })),

  replacePersonUri: (id, uri) =>
    set((s) => ({
      subjects: s.subjects.map((sub) =>
        sub.id === id
          ? { ...sub, previousUrl: sub.url || undefined, url: uri }
          : sub,
      ),
    })),

  undoPersonUri: (id) =>
    set((s) => ({
      subjects: s.subjects.map((sub) => {
        if (sub.id !== id || !sub.previousUrl) return sub;
        return {
          ...sub,
          url: sub.previousUrl,
          previousUrl: undefined,
        };
      }),
    })),

  setPersonCrop: (id, crop) =>
    set((s) => ({
      subjects: s.subjects.map((sub) =>
        sub.id === id ? { ...sub, crop } : sub,
      ),
    })),

  setPersonAdjust: (id, adjust) =>
    set((s) => ({
      subjects: s.subjects.map((sub) =>
        sub.id === id ? { ...sub, adjust } : sub,
      ),
    })),

  setPersonCopies: (id, copies) =>
    set((s) => ({
      subjects: s.subjects.map((sub) =>
        sub.id === id
          ? { ...sub, copies: Math.max(1, Math.min(48, Math.round(copies))) }
          : sub,
      ),
    })),

  applyCropToAllOfPerson: (id) => {
    // Crop is already per-subject; sheet cells inherit subject crop at pack time.
    // Kept as explicit action for UX parity with web MVP.
    const sub = get().subjects.find((s) => s.id === id);
    if (!sub) return;
    set((s) => ({
      subjects: s.subjects.map((x) =>
        x.id === id ? { ...x, crop: { ...sub.crop } } : x,
      ),
    }));
  },
}));

export function useActivePerson() {
  return useSession((s) => {
    const id = s.activePersonId ?? s.subjects[0]?.id;
    return s.subjects.find((x) => x.id === id) ?? s.subjects[0];
  });
}

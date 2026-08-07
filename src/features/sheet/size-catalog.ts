import { PHOTO_PRESETS, type SizePreset } from '@/core/presets';

export type RegionId =
  | 'nepal'
  | 'us'
  | 'eu'
  | 'argentina'
  | 'canada'
  | 'other';

export type RegionOption = {
  id: RegionId;
  label: string;
  /** Short line under the region chip when selected */
  hint: string;
  photoIds: string[];
};

/**
 * Progressive disclosure catalog — few regions, then few docs.
 * All PHOTO_PRESETS remain reachable; niche sizes live under Other.
 */
export const REGIONS: RegionOption[] = [
  {
    id: 'nepal',
    label: 'Nepal',
    hint: 'Passport, NID, visa',
    photoIds: [
      'np-passport',
      'np-citizenship',
      'np-nid',
      'np-nrn',
      'np-visa-35x45',
      'np-visa-2x2',
      'np-online-visa-1.5',
    ],
  },
  {
    id: 'us',
    label: 'United States',
    hint: 'Passport & 2×2 ID',
    photoIds: ['passport-us', 'id-2x2', 'id-1x1'],
  },
  {
    id: 'eu',
    label: 'EU / UK / AU / IN',
    hint: '35×45 mm standard',
    photoIds: ['passport-eu', 'schengen-visa', 'india-visa'],
  },
  {
    id: 'argentina',
    label: 'Argentina',
    hint: '4×4 cm & consular',
    photoIds: ['ar-passport-4x4', 'ar-1.5x1.5'],
  },
  {
    id: 'canada',
    label: 'Canada',
    hint: '50×70 mm',
    photoIds: ['passport-canada'],
  },
  {
    id: 'other',
    label: 'Other',
    hint: 'Common & visa sizes',
    photoIds: [
      'cm-4.5x3.5',
      'cm-4x3',
      'cm-4x4',
      'cm-5x5',
      'in-1.5x1.5',
      'china-visa',
      'japan-visa',
      'wallet',
    ],
  },
];

/** Papers shown by default (Hick: 3 choices). Rest behind “More”. */
export const PRIMARY_PAPER_IDS = ['4x6', '3.5x5', 'a4'] as const;

/**
 * Home “Quick sizes” — named popular docs, not raw mm chips.
 * Order = global demand + this app’s Nepal default.
 */
export const QUICK_SIZE_IDS = [
  'passport-us',
  'passport-canada',
  'passport-eu',
  'india-visa',
  'china-visa',
  'japan-visa',
  'schengen-visa',
  'np-passport',
] as const;

export type QuickSizeId = (typeof QUICK_SIZE_IDS)[number];

/** i18n key suffix under `home.quick.` for each chip. */
export const QUICK_SIZE_LABEL_KEYS: Record<QuickSizeId, string> = {
  'passport-us': 'us',
  'passport-canada': 'canada',
  'passport-eu': 'eu',
  'india-visa': 'indiaVisa',
  'china-visa': 'chinaVisa',
  'japan-visa': 'japanVisa',
  'schengen-visa': 'schengen',
  'np-passport': 'nepal',
};

export function regionForPhotoId(photoId: string): RegionId {
  for (const region of REGIONS) {
    if (region.photoIds.includes(photoId)) return region.id;
  }
  return 'other';
}

export function presetsForRegion(regionId: RegionId): SizePreset[] {
  const region = REGIONS.find((r) => r.id === regionId) ?? REGIONS[0]!;
  return region.photoIds
    .map((id) => PHOTO_PRESETS.find((p) => p.id === id))
    .filter((p): p is SizePreset => !!p);
}

/** Short label for list rows — strip redundant country prefix when in-region. */
export function shortPhotoLabel(preset: SizePreset, regionId: RegionId): string {
  let label = preset.label;
  if (regionId === 'nepal') {
    label = label.replace(/^Nepal\s+/i, '');
  } else if (regionId === 'argentina') {
    label = label.replace(/^Argentina\s+/i, '');
  } else if (regionId === 'us') {
    label = label.replace(/\s*\(US\)\s*/i, '').replace(/^2×2 in$/, 'Passport / visa 2×2 in');
  }
  return label;
}

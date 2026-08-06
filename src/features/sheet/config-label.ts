import { PAPER_PRESETS, PHOTO_PRESETS } from '@/core/presets';
import type { ConfigSnapshot } from '@/platform/prefs';
import {
  regionForPhotoId,
  REGIONS,
  shortPhotoLabel,
} from '@/features/sheet/size-catalog';

/** Compact label for a recent config chip, e.g. "Nepal · NID · 4×6". */
export function labelForConfig(config: ConfigSnapshot): {
  title: string;
  detail: string;
} {
  const regionId = regionForPhotoId(config.photoId);
  const region = REGIONS.find((r) => r.id === regionId);
  const photo = PHOTO_PRESETS.find((p) => p.id === config.photoId);
  const paper = PAPER_PRESETS.find((p) => p.id === config.paperId);

  const doc = photo
    ? shortPhotoLabel(photo, regionId)
    : 'Photo size';
  const paperBit =
    paper?.id === '4x6'
      ? '4×6 in'
      : paper?.id === '3.5x5'
        ? '3.5×5 in'
        : (paper?.label ?? 'Paper');

  return {
    title: region ? `${region.label} · ${doc}` : doc,
    detail: paperBit,
  };
}

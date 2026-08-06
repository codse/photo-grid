import { PAPER_PRESETS, PHOTO_PRESETS } from '@/core/presets';
import type { ConfigSnapshot } from '@/platform/prefs';
import {
  regionForPhotoId,
  REGIONS,
  shortPhotoLabel,
} from '@/features/sheet/size-catalog';

/** Auto name when user doesn’t supply one, e.g. "Nepal · Passport · 4×6". */
export function defaultPresetName(
  config: Pick<ConfigSnapshot, 'photoId' | 'paperId'>,
): string {
  const { title, detail } = labelForConfig(config as ConfigSnapshot);
  return `${title} · ${detail}`.slice(0, 48);
}

/** Compact label for a preset, e.g. name or "Nepal · NID · 4×6". */
export function labelForConfig(config: ConfigSnapshot): {
  title: string;
  detail: string;
} {
  if (config.name?.trim()) {
    const photo = PHOTO_PRESETS.find((p) => p.id === config.photoId);
    const paper = PAPER_PRESETS.find((p) => p.id === config.paperId);
    const size = photo
      ? `${Math.round(photo.widthMm)}×${Math.round(photo.heightMm)} mm`
      : '';
    const paperBit =
      paper?.id === '4x6'
        ? '4×6 in'
        : paper?.id === '3.5x5'
          ? '3.5×5 in'
          : (paper?.label ?? '');
    const pack =
      config.packMode === 'exact' ? 'Custom count' : 'Auto fill';
    return {
      title: config.name.trim(),
      detail: [size, paperBit, pack].filter(Boolean).join(' · '),
    };
  }

  const regionId = regionForPhotoId(config.photoId);
  const region = REGIONS.find((r) => r.id === regionId);
  const photo = PHOTO_PRESETS.find((p) => p.id === config.photoId);
  const paper = PAPER_PRESETS.find((p) => p.id === config.paperId);

  const doc = photo ? shortPhotoLabel(photo, regionId) : 'Photo size';
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

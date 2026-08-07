import { Platform } from 'react-native';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { removeBgImage } from 'rn-remove-image-bg';
import { bakeOrientation } from '@/platform/media';

export type BgRemovalResult =
  | { ok: true; uri: string; width: number; height: number }
  | { ok: false; reason: string };

export const BG_REMOVAL_AVAILABLE =
  Platform.OS === 'ios' || Platform.OS === 'android';

/**
 * On-device background removal via Apple Vision (iOS) / ML Kit (Android).
 * Bakes EXIF orientation first so cutout pixels match on-screen upright photos.
 */
export async function removeBackground(uri: string): Promise<BgRemovalResult> {
  try {
    const upright = await bakeOrientation(uri);
    const cutout = await removeBgImage(upright.uri);
    const withWhite = await compositeOnWhite(cutout);
    // Re-measure after flatten — PNG→JPEG can keep upright dims from Vision.
    const flat = await bakeOrientation(withWhite);
    return {
      ok: true,
      uri: flat.uri,
      width: flat.width,
      height: flat.height,
    };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : 'Background removal unavailable';
    return { ok: false, reason: message };
  }
}

/** Flatten possible transparency onto white JPEG for print sheets. */
export async function compositeOnWhite(uri: string): Promise<string> {
  try {
    const flat = await manipulateAsync(uri, [], {
      compress: 1,
      format: SaveFormat.JPEG,
    });
    return flat.uri;
  } catch {
    return uri;
  }
}

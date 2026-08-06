import { Platform } from 'react-native';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { removeBgImage } from 'rn-remove-image-bg';

export type BgRemovalResult =
  | { ok: true; uri: string }
  | { ok: false; reason: string };

export const BG_REMOVAL_AVAILABLE =
  Platform.OS === 'ios' || Platform.OS === 'android';

/**
 * On-device background removal via Apple Vision (iOS) / ML Kit (Android).
 */
export async function removeBackground(uri: string): Promise<BgRemovalResult> {
  try {
    const cutout = await removeBgImage(uri);
    const withWhite = await compositeOnWhite(cutout);
    return { ok: true, uri: withWhite };
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

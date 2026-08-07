import * as Font from 'expo-font';
import {
  Commissioner_600SemiBold,
  Commissioner_700Bold,
  Commissioner_800ExtraBold,
} from '@expo-google-fonts/commissioner';

let loading: Promise<boolean> | null = null;

/**
 * Promo/display faces — not needed for first paint (home/sheet).
 * Warm after interactions; Pro UI also awaits this.
 */
export function ensureDisplayFonts(): Promise<boolean> {
  if (!loading) {
    loading = Font.loadAsync({
      Commissioner_600SemiBold,
      Commissioner_700Bold,
      Commissioner_800ExtraBold,
    })
      .then(() => true)
      .catch(() => false);
  }
  return loading;
}

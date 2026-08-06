export type BgRemovalResult =
  | { ok: true; uri: string }
  | { ok: false; reason: string };

export const BG_REMOVAL_AVAILABLE = false;

/**
 * Web stub — on-device Vision / ML Kit is native-only.
 * Keep the same signature so UI can call without platform branches.
 */
export async function removeBackground(_uri: string): Promise<BgRemovalResult> {
  return {
    ok: false,
    reason: 'Background removal runs on iOS and Android only (on-device).',
  };
}

export async function compositeOnWhite(uri: string, _bg = '#FFFFFF'): Promise<string> {
  // Transparent PNG compositing needs canvas — return as-is on web stub path.
  return uri;
}

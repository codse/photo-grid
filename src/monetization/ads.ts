/**
 * Shared ads API surface for TypeScript.
 * Metro resolves `ads.native.tsx` / `ads.web.ts` at bundle time.
 */
export async function initAds(): Promise<boolean> {
  return false;
}

export async function shouldShowAds(): Promise<boolean> {
  return false;
}

export async function showInterstitialIfNeeded(
  _reason?: 'export' | 'sheet' | 'home',
): Promise<boolean> {
  return false;
}

export type RewardedResult =
  | { status: 'rewarded'; mutedUntil: number }
  | { status: 'cancelled' }
  | { status: 'unavailable'; message: string };

export async function showRewardedForAdBreak(): Promise<RewardedResult> {
  return { status: 'unavailable', message: 'Ads are not available on web.' };
}

export type BannerProps = {
  style?: object;
  size?: 'large' | 'anchored';
};

export function AdBanner(_props: BannerProps): null {
  return null;
}

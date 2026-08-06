/** Web / default stubs — real ads live in ads.native.ts */

export async function initAds(): Promise<void> {}

export async function showInterstitialIfNeeded(): Promise<boolean> {
  return false;
}

export type BannerProps = {
  style?: object;
};

export function AdBanner(_props: BannerProps): null {
  return null;
}

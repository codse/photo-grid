import { Platform, Share } from 'react-native';
import * as StoreReview from 'expo-store-review';
import {
  bumpExportCount,
  markReviewPrompted,
  shouldAskForReview,
} from '@/monetization/ads-prefs';

/** ASC app id — Passport Photo Print. */
export const APP_STORE_ID = '6798807833';
export const APP_STORE_URL = `https://apps.apple.com/app/id${APP_STORE_ID}`;
export const PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.codse.passport.photo.print';

export function storeListingUrl(): string {
  return Platform.OS === 'android' ? PLAY_STORE_URL : APP_STORE_URL;
}

/** Native “Rate this app” sheet when the OS allows it. */
export async function maybeRequestReview(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    if (!(await shouldAskForReview())) return false;
    const available = await StoreReview.isAvailableAsync();
    if (!available) return false;
    await StoreReview.requestReview();
    await markReviewPrompted();
    return true;
  } catch {
    return false;
  }
}

/** Call after a successful share/save export. */
export async function onExportSuccessEngagement(): Promise<void> {
  await bumpExportCount();
  // Slight delay so we don’t stack on interstitial.
  setTimeout(() => {
    void maybeRequestReview();
  }, 1800);
}

export async function shareApp(): Promise<void> {
  const url = storeListingUrl();
  const message =
    Platform.OS === 'ios'
      ? `Passport Photo Print — crop to size and print at home.\n${url}`
      : 'Passport Photo Print — crop to size and print at home.';
  await Share.share(
    Platform.OS === 'ios'
      ? { message, url }
      : { message: `${message}\n${url}` },
  );
}

export async function requestReviewNow(): Promise<void> {
  if (Platform.OS === 'web') return;
  if (await StoreReview.isAvailableAsync()) {
    await StoreReview.requestReview();
    await markReviewPrompted();
    return;
  }
  // Fallback: open listing.
  const { Linking } = await import('react-native');
  await Linking.openURL(storeListingUrl());
}

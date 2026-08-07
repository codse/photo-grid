import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, View, type ViewStyle } from 'react-native';
import mobileAds, {
  AdEventType,
  BannerAd,
  BannerAdSize,
  InterstitialAd,
  RewardedAd,
  RewardedAdEventType,
  TestIds,
  useForeground,
} from 'react-native-google-mobile-ads';
import { getCachedIsPro, isPro, refreshCustomerInfo } from './purchases';
import {
  getForceFreeAdsSync,
  isAdsMutedNow,
  loadForceFreeAds,
  muteAdsForMs,
  REWARDED_MUTE_MS,
} from './ads-prefs';

/** From edv-guide (Android). Override via env when real iOS units exist. */
const EDV_BANNER = 'ca-app-pub-3859855802547804/8100990773';
const EDV_INTERSTITIAL = 'ca-app-pub-3859855802547804/5372693571';
const EDV_REWARDED = 'ca-app-pub-3859855802547804/5372693571'; // fallback until dedicated unit

const FORCE_TEST_ADS =
  __DEV__ || process.env.EXPO_PUBLIC_ADMOB_USE_TEST_IDS !== '0';

const BANNER_UNIT =
  process.env.EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID?.trim() ||
  (FORCE_TEST_ADS ? TestIds.ADAPTIVE_BANNER : EDV_BANNER);

const INTERSTITIAL_UNIT =
  process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_UNIT_ID?.trim() ||
  (FORCE_TEST_ADS ? TestIds.INTERSTITIAL : EDV_INTERSTITIAL);

const REWARDED_UNIT =
  process.env.EXPO_PUBLIC_ADMOB_REWARDED_UNIT_ID?.trim() ||
  (FORCE_TEST_ADS ? TestIds.REWARDED : EDV_REWARDED);

/** Don’t stack full-screens — feels spammy. */
const INTERSTITIAL_COOLDOWN_MS = 90_000;

let adsReady = false;
let adsInitPromise: Promise<boolean> | null = null;
let interstitial: InterstitialAd | null = null;
let interstitialLoaded = false;
let lastInterstitialAt = 0;
let rewarded: RewardedAd | null = null;
let rewardedLoaded = false;

async function adsAreSuppressed(): Promise<boolean> {
  await loadForceFreeAds();
  if (getForceFreeAdsSync()) return false;
  if (await isAdsMutedNow()) return true;
  try {
    if (getCachedIsPro() || (await isPro())) return true;
  } catch {
    // show ads if RC fails
  }
  return false;
}

/** True when banners / interstitials should appear. */
export async function shouldShowAds(): Promise<boolean> {
  return !(await adsAreSuppressed());
}

function ensureInterstitial() {
  if (interstitial) return;
  interstitial = InterstitialAd.createForAdRequest(INTERSTITIAL_UNIT, {
    requestNonPersonalizedAdsOnly: true,
  });
  interstitial.addAdEventListener(AdEventType.LOADED, () => {
    interstitialLoaded = true;
    if (__DEV__) console.log('[AdMob] interstitial loaded');
  });
  interstitial.addAdEventListener(AdEventType.CLOSED, () => {
    interstitialLoaded = false;
    interstitial?.load();
  });
  interstitial.addAdEventListener(AdEventType.ERROR, (err) => {
    interstitialLoaded = false;
    if (__DEV__) console.warn('[AdMob] interstitial error', err);
  });
  interstitial.load();
}

function ensureRewarded() {
  if (rewarded) return;
  rewarded = RewardedAd.createForAdRequest(REWARDED_UNIT, {
    requestNonPersonalizedAdsOnly: true,
  });
  rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => {
    rewardedLoaded = true;
    if (__DEV__) console.log('[AdMob] rewarded loaded');
  });
  rewarded.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
    if (__DEV__) console.log('[AdMob] rewarded earned');
  });
  rewarded.addAdEventListener(AdEventType.CLOSED, () => {
    rewardedLoaded = false;
    rewarded?.load();
  });
  rewarded.addAdEventListener(AdEventType.ERROR, (err) => {
    rewardedLoaded = false;
    if (__DEV__) console.warn('[AdMob] rewarded error', err);
  });
  rewarded.load();
}

export async function initAds(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  if (adsReady) return true;
  if (adsInitPromise) return adsInitPromise;

  adsInitPromise = (async () => {
    try {
      await mobileAds().setRequestConfiguration({
        testDeviceIdentifiers: ['EMULATOR'],
      });
      await mobileAds().initialize();
      adsReady = true;
      if (__DEV__) {
        console.log('[AdMob] initialized', {
          BANNER_UNIT,
          INTERSTITIAL_UNIT,
          REWARDED_UNIT,
        });
      }
    } catch (e) {
      if (__DEV__) console.warn('[AdMob] initialize failed', e);
      adsInitPromise = null;
      return false;
    }

    try {
      await refreshCustomerInfo();
      await loadForceFreeAds();
    } catch {
      // optional
    }

    // Always preload creatives so force-free / mute expiry can show immediately.
    ensureInterstitial();
    ensureRewarded();
    return true;
  })();

  return adsInitPromise;
}

/**
 * Full-screen ad at natural pauses (after export).
 * Cooldown + Pro / rewarded mute / force-free aware.
 */
export async function showInterstitialIfNeeded(
  reason: 'export' | 'sheet' | 'home' = 'export',
): Promise<boolean> {
  if (!(await shouldShowAds())) return false;
  if (!adsReady) await initAds();
  ensureInterstitial();

  const now = Date.now();
  if (now - lastInterstitialAt < INTERSTITIAL_COOLDOWN_MS) {
    if (__DEV__) console.log('[AdMob] interstitial cooldown', reason);
    return false;
  }

  if (!interstitial || !interstitialLoaded) {
    interstitial?.load();
    return false;
  }

  try {
    await interstitial.show();
    lastInterstitialAt = Date.now();
    return true;
  } catch (e) {
    if (__DEV__) console.warn('[AdMob] interstitial show failed', e);
    return false;
  }
}

export type RewardedResult =
  | { status: 'rewarded'; mutedUntil: number }
  | { status: 'cancelled' }
  | { status: 'unavailable'; message: string };

/** Watch a rewarded ad → mute ads for {@link REWARDED_MUTE_MS}. */
export async function showRewardedForAdBreak(): Promise<RewardedResult> {
  if (Platform.OS === 'web') {
    return { status: 'unavailable', message: 'Ads are not available on web.' };
  }
  await loadForceFreeAds();
  // Still allow rewarded even when Pro? No — Pro already has no ads.
  if (!getForceFreeAdsSync()) {
    try {
      if (getCachedIsPro() || (await isPro())) {
        return {
          status: 'unavailable',
          message: 'You’re already Pro — ads are off.',
        };
      }
    } catch {
      // continue
    }
  }

  if (!adsReady) await initAds();
  ensureRewarded();

  if (!rewarded || !rewardedLoaded) {
    rewarded?.load();
    return {
      status: 'unavailable',
      message: 'Ad isn’t ready yet — try again in a moment.',
    };
  }

  return new Promise((resolve) => {
    let earned = false;
    const unsubEarn = rewarded!.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      () => {
        earned = true;
      },
    );
    const unsubClose = rewarded!.addAdEventListener(AdEventType.CLOSED, () => {
      unsubEarn();
      unsubClose();
      void (async () => {
        if (earned) {
          const mutedUntil = await muteAdsForMs(REWARDED_MUTE_MS);
          resolve({ status: 'rewarded', mutedUntil });
        } else {
          resolve({ status: 'cancelled' });
        }
      })();
    });

    void rewarded!.show().catch((e) => {
      unsubEarn();
      unsubClose();
      if (__DEV__) console.warn('[AdMob] rewarded show failed', e);
      resolve({
        status: 'unavailable',
        message: 'Couldn’t show the ad.',
      });
    });
  });
}

export type BannerProps = {
  style?: ViewStyle;
  /** Compact banner for denser screens (sheet). */
  size?: 'large' | 'anchored';
};

export function AdBanner({ style, size = 'large' }: BannerProps) {
  const [show, setShow] = useState(false);
  const [ready, setReady] = useState(adsReady);
  const [failed, setFailed] = useState(false);
  const bannerRef = useRef<BannerAd>(null);

  const refreshGate = useCallback(async () => {
    const ok = await initAds();
    setReady(ok);
    setShow(await shouldShowAds());
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await refreshGate();
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshGate]);

  useForeground(() => {
    if (Platform.OS === 'ios') bannerRef.current?.load();
    void refreshGate();
  });

  if (!show || !ready || failed) return null;

  const adSize =
    size === 'anchored'
      ? BannerAdSize.ANCHORED_ADAPTIVE_BANNER
      : BannerAdSize.LARGE_ANCHORED_ADAPTIVE_BANNER;

  return (
    <View style={[{ alignItems: 'center', width: '100%' }, style]}>
      <BannerAd
        ref={bannerRef}
        unitId={BANNER_UNIT}
        size={adSize}
        requestOptions={{ requestNonPersonalizedAdsOnly: true }}
        onAdLoaded={() => {
          if (__DEV__) console.log('[AdMob] banner loaded');
        }}
        onAdFailedToLoad={(error) => {
          if (__DEV__) console.warn('[AdMob] banner failed', error);
          setFailed(true);
        }}
      />
    </View>
  );
}

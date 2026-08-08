import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, View, type ViewStyle } from 'react-native';
import mobileAds, {
  AdEventType,
  BannerAd,
  BannerAdSize,
  InterstitialAd,
  RewardedAdEventType,
  RewardedInterstitialAd,
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

/** Production AdMob units (Passport / ID Photo Maker). */
const EDV_BANNER = 'ca-app-pub-3859855802547804/3971816390';
const EDV_INTERSTITIAL = 'ca-app-pub-3859855802547804/5372693571';
/** Rewarded interstitial — “ads off 1 hour” break. */
const EDV_REWARDED_INTERSTITIAL =
  'ca-app-pub-3859855802547804/2171649565';

/**
 * Test units only in DEV, or when explicitly opted in.
 * IMPORTANT: `!== '0'` is wrong — unset env is also !== '0', so Release/TF
 * was shipping Google TestIds and often no-filling on device.
 */
const FORCE_TEST_ADS =
  __DEV__ || process.env.EXPO_PUBLIC_ADMOB_USE_TEST_IDS === '1';

const BANNER_UNIT =
  process.env.EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID?.trim() ||
  (FORCE_TEST_ADS ? TestIds.ADAPTIVE_BANNER : EDV_BANNER);

const INTERSTITIAL_UNIT =
  process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_UNIT_ID?.trim() ||
  (FORCE_TEST_ADS ? TestIds.INTERSTITIAL : EDV_INTERSTITIAL);

const REWARDED_UNIT =
  process.env.EXPO_PUBLIC_ADMOB_REWARDED_UNIT_ID?.trim() ||
  (FORCE_TEST_ADS
    ? TestIds.REWARDED_INTERSTITIAL
    : EDV_REWARDED_INTERSTITIAL);

/** Don’t stack full-screens — feels spammy. */
const INTERSTITIAL_COOLDOWN_MS = 90_000;

let adsReady = false;
let adsInitPromise: Promise<boolean> | null = null;
let interstitial: InterstitialAd | null = null;
let interstitialLoaded = false;
let lastInterstitialAt = 0;
let rewarded: RewardedInterstitialAd | null = null;
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
  rewarded = RewardedInterstitialAd.createForAdRequest(REWARDED_UNIT, {
    requestNonPersonalizedAdsOnly: true,
  });
  rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => {
    rewardedLoaded = true;
    if (__DEV__) console.log('[AdMob] rewarded interstitial loaded');
  });
  rewarded.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
    if (__DEV__) console.log('[AdMob] rewarded interstitial earned');
  });
  rewarded.addAdEventListener(AdEventType.CLOSED, () => {
    rewardedLoaded = false;
    rewarded?.load();
  });
  rewarded.addAdEventListener(AdEventType.ERROR, (err) => {
    rewardedLoaded = false;
    if (__DEV__) console.warn('[AdMob] rewarded interstitial error', err);
  });
  rewarded.load();
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(
      () => reject(new Error(`[AdMob] ${label} timed out after ${ms}ms`)),
      ms,
    );
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

/** Wait until rewarded is loaded (or timeout / error). */
function waitForRewardedLoaded(ms = 12_000): Promise<boolean> {
  if (rewardedLoaded) return Promise.resolve(true);
  ensureRewarded();
  return new Promise((resolve) => {
    const start = Date.now();
    const tick = () => {
      if (rewardedLoaded) {
        resolve(true);
        return;
      }
      if (Date.now() - start >= ms) {
        resolve(false);
        return;
      }
      setTimeout(tick, 200);
    };
    tick();
  });
}

export async function initAds(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  if (adsReady) return true;
  if (adsInitPromise) return adsInitPromise;

  adsInitPromise = (async () => {
    try {
      if (__DEV__) console.log('[AdMob] initializing…');
      await withTimeout(
        mobileAds().setRequestConfiguration({
          // EMULATOR + common debug; real device IDs appear in Xcode console as
          // "GADMobileAds … test device" — paste into EXPO_PUBLIC_ADMOB_TEST_DEVICE_IDS
          testDeviceIdentifiers: [
            'EMULATOR',
            ...(process.env.EXPO_PUBLIC_ADMOB_TEST_DEVICE_IDS?.split(',')
              .map((s) => s.trim())
              .filter(Boolean) ?? []),
          ],
        }),
        8_000,
        'setRequestConfiguration',
      );
      await withTimeout(mobileAds().initialize(), 15_000, 'initialize');
      adsReady = true;
      if (__DEV__) {
        console.log('[AdMob] initialized', {
          BANNER_UNIT,
          INTERSTITIAL_UNIT,
          REWARDED_UNIT,
          pro: getCachedIsPro(),
          forceFree: getForceFreeAdsSync(),
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
 * Skips silently if a creative isn’t already loaded — never blocks on fetch.
 */
export async function showInterstitialIfNeeded(
  reason: 'export' | 'sheet' | 'home' = 'export',
): Promise<boolean> {
  if (!(await shouldShowAds())) {
    if (__DEV__) {
      console.log('[AdMob] interstitial skipped — suppressed', {
        reason,
        pro: getCachedIsPro(),
        forceFree: getForceFreeAdsSync(),
      });
    }
    return false;
  }
  if (!adsReady) await initAds();
  ensureInterstitial();

  const now = Date.now();
  if (now - lastInterstitialAt < INTERSTITIAL_COOLDOWN_MS) {
    if (__DEV__) console.log('[AdMob] interstitial cooldown', reason);
    return false;
  }

  if (!interstitial || !interstitialLoaded) {
    interstitial?.load();
    if (__DEV__) console.log('[AdMob] interstitial not ready', reason);
    return false;
  }

  try {
    await interstitial.show();
    lastInterstitialAt = Date.now();
    if (__DEV__) console.log('[AdMob] interstitial shown', reason);
    return true;
  } catch (e) {
    if (__DEV__) console.warn('[AdMob] interstitial show failed', e);
    interstitialLoaded = false;
    interstitial?.load();
    return false;
  }
}

export type RewardedResult =
  | { status: 'rewarded'; mutedUntil: number }
  | { status: 'cancelled' }
  | { status: 'unavailable'; message: string };

/** Watch a rewarded ad → mute ads for {@link REWARDED_MUTE_MS}. */
export async function showRewardedForAdBreak(): Promise<RewardedResult> {
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

  if (!adsReady) {
    const ok = await initAds();
    if (!ok) {
      return {
        status: 'unavailable',
        message: 'Ads failed to initialize — check Metro for [AdMob] logs.',
      };
    }
  }
  ensureRewarded();

  if (!rewardedLoaded) {
    const loaded = await waitForRewardedLoaded(12_000);
    if (!loaded || !rewarded) {
      return {
        status: 'unavailable',
        message: 'Ad isn’t ready yet — try again in a moment.',
      };
    }
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
          // Keep a breadcrumb in release — no-fill / misconfig is otherwise silent.
          console.warn('[AdMob] banner failed', error);
          setFailed(true);
        }}
      />
    </View>
  );
}

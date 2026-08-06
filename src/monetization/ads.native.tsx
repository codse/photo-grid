import { useEffect, useRef, useState } from 'react';
import { Platform, View, type ViewStyle } from 'react-native';
import mobileAds, {
  AdEventType,
  BannerAd,
  BannerAdSize,
  InterstitialAd,
  TestIds,
  useForeground,
} from 'react-native-google-mobile-ads';
import { getCachedIsPro, isPro, refreshCustomerInfo } from './purchases';

/** From edv-guide (Android). Override via env when real iOS units exist. */
const EDV_BANNER = 'ca-app-pub-3859855802547804/8100990773';
const EDV_INTERSTITIAL = 'ca-app-pub-3859855802547804/5372693571';

/** Always use Google test units until real iOS AdMob units are wired. */
const FORCE_TEST_ADS =
  __DEV__ || process.env.EXPO_PUBLIC_ADMOB_USE_TEST_IDS !== '0';

const BANNER_UNIT =
  process.env.EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID?.trim() ||
  (FORCE_TEST_ADS ? TestIds.ADAPTIVE_BANNER : EDV_BANNER);

const INTERSTITIAL_UNIT =
  process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_UNIT_ID?.trim() ||
  (FORCE_TEST_ADS ? TestIds.INTERSTITIAL : EDV_INTERSTITIAL);

let adsReady = false;
let adsInitPromise: Promise<boolean> | null = null;
let interstitial: InterstitialAd | null = null;
let interstitialLoaded = false;

export async function initAds(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  if (adsReady) return true;
  if (adsInitPromise) return adsInitPromise;

  adsInitPromise = (async () => {
    try {
      await mobileAds().setRequestConfiguration({
        // Real device: check Xcode/Metro for "Use RequestConfiguration.Builder.setTestDeviceIds"
        testDeviceIdentifiers: ['EMULATOR'],
      });
      await mobileAds().initialize();
      adsReady = true;
      if (__DEV__) console.log('[AdMob] initialized', { BANNER_UNIT, INTERSTITIAL_UNIT });
    } catch (e) {
      if (__DEV__) console.warn('[AdMob] initialize failed', e);
      adsInitPromise = null;
      return false;
    }

    try {
      await refreshCustomerInfo();
      if (await isPro()) return true;
    } catch {
      // RevenueCat optional — still show ads
    }

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
    return true;
  })();

  return adsInitPromise;
}

/** Show interstitial unless the user owns Lifetime / Pro. */
export async function showInterstitialIfNeeded(): Promise<boolean> {
  try {
    if (getCachedIsPro() || (await isPro())) return false;
  } catch {
    // ignore
  }
  if (!adsReady) await initAds();
  if (!interstitial || !interstitialLoaded) {
    interstitial?.load();
    return false;
  }

  try {
    await interstitial.show();
    return true;
  } catch (e) {
    if (__DEV__) console.warn('[AdMob] interstitial show failed', e);
    return false;
  }
}

export type BannerProps = {
  style?: ViewStyle;
};

export function AdBanner({ style }: BannerProps) {
  const [pro, setPro] = useState(getCachedIsPro());
  const [ready, setReady] = useState(adsReady);
  const [failed, setFailed] = useState(false);
  const bannerRef = useRef<BannerAd>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const ok = await initAds();
      if (cancelled) return;
      setReady(ok);
      try {
        setPro(await isPro());
      } catch {
        setPro(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useForeground(() => {
    if (Platform.OS === 'ios') bannerRef.current?.load();
  });

  if (pro || !ready || failed) return null;

  return (
    <View style={[{ alignItems: 'center', width: '100%' }, style]}>
      <BannerAd
        ref={bannerRef}
        unitId={BANNER_UNIT}
        size={BannerAdSize.LARGE_ANCHORED_ADAPTIVE_BANNER}
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

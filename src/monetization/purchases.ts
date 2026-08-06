import { Platform } from 'react-native';
import Purchases, {
  LOG_LEVEL,
  PURCHASES_ERROR_CODE,
  type CustomerInfo,
  type PurchasesPackage,
} from 'react-native-purchases';
import { ENTITLEMENT_ID, LIFETIME_PRODUCT_ID } from './catalog';

const SHARED_KEY = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY?.trim() || undefined;
const IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY?.trim() || undefined;
const ANDROID_KEY =
  process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY?.trim() || undefined;

let initPromise: Promise<void> | null = null;
let lastCustomerInfo: CustomerInfo | null = null;

function getApiKey(): string | null {
  if (Platform.OS === 'ios') return IOS_KEY ?? SHARED_KEY ?? null;
  if (Platform.OS === 'android') return ANDROID_KEY ?? SHARED_KEY ?? null;
  return SHARED_KEY ?? null;
}

export function purchasesConfigured(): boolean {
  return getApiKey() != null;
}

export async function configurePurchases(): Promise<void> {
  if (Platform.OS === 'web') return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const apiKey = getApiKey();
    if (!apiKey) {
      if (__DEV__) {
        console.warn(
          '[RevenueCat] Missing EXPO_PUBLIC_REVENUECAT_IOS_API_KEY / EXPO_PUBLIC_REVENUECAT_API_KEY',
        );
      }
      return;
    }

    if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    Purchases.configure({ apiKey });
    lastCustomerInfo = await Purchases.getCustomerInfo();
  })();

  return initPromise;
}

function hasEntitlement(info: CustomerInfo): boolean {
  return info.entitlements.active[ENTITLEMENT_ID] != null;
}

export function isProFromInfo(info: CustomerInfo | null | undefined): boolean {
  if (!info) return false;
  if (hasEntitlement(info)) return true;
  return info.allPurchasedProductIdentifiers.includes(LIFETIME_PRODUCT_ID);
}

export async function refreshCustomerInfo(): Promise<CustomerInfo | null> {
  if (Platform.OS === 'web' || !getApiKey()) return lastCustomerInfo;
  await configurePurchases();
  try {
    lastCustomerInfo = await Purchases.getCustomerInfo();
    return lastCustomerInfo;
  } catch (e) {
    if (__DEV__) console.warn('[RevenueCat] getCustomerInfo failed', e);
    return lastCustomerInfo;
  }
}

export async function isPro(): Promise<boolean> {
  const info = await refreshCustomerInfo();
  return isProFromInfo(info);
}

export function getCachedIsPro(): boolean {
  return isProFromInfo(lastCustomerInfo);
}

function isUserCancelled(error: unknown): boolean {
  const e = error as { userCancelled?: boolean; code?: string | number };
  return (
    e?.userCancelled === true ||
    e?.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR ||
    String(e?.code) === '1'
  );
}

async function findLifetimePackage(): Promise<PurchasesPackage | null> {
  const offerings = await Purchases.getOfferings();
  const current = offerings.current;
  if (!current) return null;

  const fromLifetime = current.lifetime;
  if (fromLifetime?.product.identifier === LIFETIME_PRODUCT_ID) {
    return fromLifetime;
  }

  const match = current.availablePackages.find(
    (p) => p.product.identifier === LIFETIME_PRODUCT_ID,
  );
  return match ?? null;
}

export type PurchaseResult =
  | { status: 'success'; isPro: true }
  | { status: 'cancelled' }
  | { status: 'unavailable'; message: string }
  | { status: 'error'; message: string };

export async function purchaseLifetime(): Promise<PurchaseResult> {
  if (Platform.OS === 'web') {
    return { status: 'unavailable', message: 'Purchases are only on iOS / Android.' };
  }
  if (!getApiKey()) {
    return {
      status: 'unavailable',
      message: 'RevenueCat is not configured yet.',
    };
  }

  await configurePurchases();

  try {
    const pkg = await findLifetimePackage();
    if (!pkg) {
      return {
        status: 'unavailable',
        message:
          'Lifetime product is not in the current offering. Check RevenueCat + App Store Connect.',
      };
    }

    const { customerInfo } = await Purchases.purchasePackage(pkg);
    lastCustomerInfo = customerInfo;
    if (isProFromInfo(customerInfo)) {
      return { status: 'success', isPro: true };
    }
    return {
      status: 'error',
      message: 'Purchase completed but Pro entitlement is not active yet.',
    };
  } catch (e) {
    if (isUserCancelled(e)) return { status: 'cancelled' };
    return {
      status: 'error',
      message: e instanceof Error ? e.message : 'Purchase failed.',
    };
  }
}

export async function restorePurchases(): Promise<PurchaseResult> {
  if (Platform.OS === 'web') {
    return { status: 'unavailable', message: 'Restore is only on iOS / Android.' };
  }
  if (!getApiKey()) {
    return {
      status: 'unavailable',
      message: 'RevenueCat is not configured yet.',
    };
  }

  await configurePurchases();

  try {
    const info = await Purchases.restorePurchases();
    lastCustomerInfo = info;
    if (isProFromInfo(info)) return { status: 'success', isPro: true };
    return {
      status: 'error',
      message: 'No previous Lifetime purchase found for this Apple ID.',
    };
  } catch (e) {
    return {
      status: 'error',
      message: e instanceof Error ? e.message : 'Restore failed.',
    };
  }
}

export async function lifetimePriceString(): Promise<string | null> {
  if (Platform.OS === 'web' || !getApiKey()) return null;
  await configurePurchases();
  try {
    const pkg = await findLifetimePackage();
    return pkg?.product.priceString ?? null;
  } catch {
    return null;
  }
}

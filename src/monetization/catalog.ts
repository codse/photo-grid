/** Store + RevenueCat identifiers for Passport Photo Print. */

export const LIFETIME_PRODUCT_ID = 'com.codse.passport.photo.print.lifetime';

/** RevenueCat entitlement that unlocks ad-free / Pro. */
export const ENTITLEMENT_ID =
  process.env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID?.trim() || 'pro';

/** Fallback when StoreKit/RC priceString isn’t available yet. */
export const LIFETIME_PRICE_LABEL = '$9.99';

export const LIFETIME_DISPLAY_NAME = 'Lifetime';
export const LIFETIME_DESCRIPTION =
  'Remove ads forever. One purchase, all devices signed into your Apple ID.';

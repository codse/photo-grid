# Status

## Done
- ASC app: **6798807833** (`com.codse.passport.photo.print`)
  - Display name auto-suffixed to `Passport Photo Print - print` (name taken) — rename in ASC UI if you want
- Lifetime IAP: `com.codse.passport.photo.print.lifetime` @ $4.99 — **READY_TO_SUBMIT** (id `6798808045`)
- EAS iOS credentials ready (dist cert + App Store profile)
- Embedded legal pages (app + web)

## Next
1. Fix lockfile + rebuild (build #6 failed: `npm ci` lock out of sync)
2. `source .env.asc.local && eas submit -p ios --latest --non-interactive`
3. RevenueCat: new project for this bundle → `appl_…` into EAS env `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`

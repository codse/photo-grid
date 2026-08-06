# Overnight status — Passport Photo Print

## Shipped tonight
- ASC app **6798807833** (`com.codse.passport.photo.print`)
  - Display name: `Passport Photo Print - print` (rename in ASC if you want)
- Lifetime IAP **READY_TO_SUBMIT**: `com.codse.passport.photo.print.lifetime` @ $4.99 (`6798808045`)
- EAS iOS creds ready; `eas.json` has `ascAppId`
- Settings polish: language picker row + icons + brand blurb
- Lockfile fixed for EAS `npm ci` (`@testing-library/dom`, `@react-native/metro-config`)
- ASC v1.0 en-US description / keywords / support URL set

## In flight
- EAS production **build #8**: https://expo.dev/accounts/codse/projects/passport-photo-print/builds/4b61dcf5-981c-4642-860d-a6faa1baf525
- After green:
  ```bash
  source .env.asc.local
  eas submit -p ios --latest --non-interactive
  ```

## Still need you / morning
1. **RevenueCat** — create project “Passport Photo Print”, App Store app with bundle `com.codse.passport.photo.print`, entitlement `pro`, product lifetime, put `appl_…` in EAS env + `.env`
2. Optional: rename ASC app to drop ` - print`
3. AdMob production iOS app id (still using Google test id in app.json)

## Local secrets (gitignored)
- `.env.asc.local` — ASC API key env for submit
- `.env` — RC public key stub

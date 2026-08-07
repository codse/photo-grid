# Overnight / morning status — Passport Photo Print

## Done
- ASC app **6798807833** + lifetime IAP READY_TO_SUBMIT
- EAS build **#8** finished + TestFlight submit **finished** (ASC build VALID)
- **RevenueCat project** `projf0df0e39` (Passport Photo Print)
  - App Store app `app915c6d09d1` / bundle `com.codse.passport.photo.print`
  - Entitlement `pro`
  - Product `com.codse.passport.photo.print.lifetime` → `$rc_lifetime` package on `default` offering
  - Public iOS key in local `.env` + EAS production/preview env
- Settings polish shipped

## Optional next
1. In RC Apps → Passport Photo Print → connect App Store Connect API key (receipts / better sync)
2. Rename ASC display name off `Passport Photo Print - print`
3. Production AdMob iOS app id (still Google test id in app.json)
4. New EAS build if you want RC key baked into TF binary (env was set after build #8)

## Local secrets (gitignored)
- `.env` — public RC iOS key
- `.env.rc.local` — RC secret for API setup
- `.env.asc.local` — ASC p8 env for submit

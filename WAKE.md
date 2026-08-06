# Morning checklist — Passport Photo Print

Agent worked overnight. **TestFlight is blocked until you unlock ASC + RevenueCat keys.**

## Do this first (interactive — needs you)

1. **Apple web login** (app create requires web session, not just API key):
   ```bash
   asc web auth login --apple-id developer@codse.com
   ```
2. **Create ASC app**:
   ```bash
   asc web apps create \
     --name "Passport Photo Print" \
     --bundle-id "com.codse.passport.photo.print" \
     --sku "PASSPORT_PHOTO_PRINT" \
     --primary-locale "en-US"
   ```
3. **Create IAP** (non-consumable, `$4.99`):
   - Product id: `com.codse.passport.photo.print.lifetime`
   - Or: `./scripts/setup-asc-lifetime.sh` if env is set
4. **RevenueCat**
   - Run `./scripts/setup-revenuecat.sh` with `REVENUECAT_*` env
   - Put public iOS key in `.env`:
     `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=appl_...`
5. **EAS → TestFlight**
   ```bash
   eas build --platform ios --profile production
   eas submit --platform ios --latest
   ```

## Already shipped tonight

- Keep **RevenueCat** for the single lifetime IAP (restore + entitlement + price)
- Legal: About / Privacy / Terms / Disclaimer + Settings gear
- i18n: `en`, `en-GB`, `pt`, `ne`, `hi`, `es`, `fr` (home, Pro, settings, saved)
- BACKLOG updated — sheet crop preview gap is **done**
- Commits pushed to `main`

## Still open (product gaps)

- Multi-select Tile ready
- Custom mm size
- Face / head guides
- Wire remaining screens fully to i18n (export, sheet, crop, camera, size)
- Native crop-canvas filters parity
- Tests

## IAP: RC vs native?

**Keep RevenueCat.** One SKU is simple enough for StoreKit alone, but RC is already wired and buys you restore, live price, and ads gating without receipt glue.

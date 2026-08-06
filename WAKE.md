# Morning / unblock checklist

## Blockers right now

### 1. App Store Connect web session (blocks app create)
- Bundle ID **already exists**: `com.codse.passport.photo.print` (`ZUYP8U28XN`)
- ASC **API cannot create apps** (`CREATE` forbidden) — must use web:
  ```bash
  ASC_WEB_PASSWORD='…' asc web auth login --apple-id developer@codse.com
  # then 2FA when prompted
  asc web apps create \
    --name "Passport Photo Print" \
    --bundle-id "com.codse.passport.photo.print" \
    --sku "PASSPORT_PHOTO_PRINT" \
    --primary-locale "en-US"
  ```
- Collaborative browser was on the **login** screen (not logged in). Apple also shows **ASC maintenance** on RevenueCat.
- Cached `~/.asc/web` session is **expired** (Aug 4).

### 2. After ASC app exists
```bash
APP_ID=<numeric> ./scripts/setup-asc-lifetime.sh
```

### 3. RevenueCat (dashboard is logged in)
- Projects: Affirmation / Animata / Sisu — **no Passport project yet**
- Affirmation public iOS key (for reference only — **do not reuse** for Passport):
  - `appl_fAFWTBaTpffkTMhpfaHaqPxmnXu`
- Sisu public iOS key (also wrong bundle):
  - `appl_YUJTZKZgbvuFufXYjWUqMUjMHSU`
- Create a **new RC project** “Passport Photo Print” → Add App Store app with  
  `com.codse.passport.photo.print` → copy `appl_…` into:
  - local `.env` → `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`
  - EAS production env
- Entitlement: `pro`  
- Product: `com.codse.passport.photo.print.lifetime` (lifetime package on Current offering)

### 4. EAS credentials (interactive once)
```bash
eas build --platform ios --profile production
```

## Legal pages
- **Embedded in-app** routes stay: `/about` `/privacy` `/terms` `/disclaimer` (also work on Expo web).
- CODSE website legal can stay the canonical marketing URLs later; app uses local docs so offline / review works.

## IAP decision (unchanged)
Keep **RevenueCat** for the one-time Lifetime unlock.

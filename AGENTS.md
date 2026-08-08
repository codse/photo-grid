# AGENTS.md — CODSE Expo / App Store playbook

This repo (`passport-photo-print`) is the **template** for future CODSE consumer apps. Agents must follow this file without being reminded.

Related always-on Cursor rules: `.cursor/rules/*.mdc`.

---

## 0. Non-negotiables

1. **Commit frequently** — after every logical unit (feature slice, fix, i18n keys, ASC script, token change). Conventional Commits. Stage **specific files** only (`git add path`), never `git add -A` / `.`.
2. **Do not wait** for the human to say “commit”. If a unit is done and the tree is dirty with intentional work, commit it.
3. **Never commit secrets** — `.env`, `.secrets/`, `*.p8`, `eas.submit.local.json`, AuthKeys, absolute machine paths to keys.
4. **Do not push** unless the human asks.
5. Prefer **`.native.ts(x)` / `.web.ts(x)`** with matching extensions. A bare `foo.ts` next to `foo.native.tsx` (mismatched ext) can make Metro ship the **web stub on iOS** (seen with ads → “Ads are not available on web” on device). Prefer `foo.web.ts` + `foo.native.tsx`, or same-ext pairs like `render-sheet.ts` / `render-sheet.native.ts`.
6. When inventing process (ASC, RC, screenshots, i18n), **write it back into this file** so the next session inherits it.

---

## 1. Product stack (this app)

| Piece | Value |
|-------|--------|
| Bundle | `com.codse.passport.photo.print` |
| ASC app id | `6798807833` |
| Expo slug | `passport-photo-print` |
| Team | `53WLLK8L87` |
| EAS project | `086260f6-73c5-4094-ae95-40b451b7946a` |
| Lifetime IAP | `com.codse.passport.photo.print.lifetime` @ **$4.99** USD |
| RC project | `projf0df0e39` |
| RC iOS app | `app915c6d09d1` |
| Entitlement | `pro` |
| Accent | soft ochre `#B8953F` (`src/ui/tokens.ts`) |

Update this table when spinning a **new** app (new bundle, ASC id, RC project).

---

## 2. Git / commits

Format (match history):

```
feat(scope): imperative summary
fix(scope): …
style(ui): …
chore: …
docs: …
```

Split mixed WIP by concern (prefs → export → monetization → UI → i18n → docs).  
If one file mixes concerns and patch staging isn’t available, commit under the **primary** concern.

Rule file: `.cursor/rules/granular-commits.mdc` (`alwaysApply: true`).

---

## 3. Secrets layout

Metro/`require.context` can ingest `.env*` files → **do not** put RC/ASC secrets in `.env.rc.local`-style names.

| File | Purpose |
|------|---------|
| `.env` | Public keys only (`EXPO_PUBLIC_*`) — gitignored |
| `.env.example` | Documented empty template — committed |
| `.secrets/rc.sh` | RevenueCat secret API for setup scripts |
| `.secrets/asc.sh` | ASC p8 path / key id / issuer for `asc` + EAS submit |
| `eas.submit.local.json` | Local submit overrides — gitignored |

Source ASC env: `source .secrets/asc.sh` (never paste key material into chat logs or commits).

---

## 4. i18n (translations)

**Stack:** `i18next` + `react-i18next` + `expo-localization` — `src/i18n/`.

**In-app locales:** `en`, `en-GB`, `pt`, `ne`, `hi`, `es`, `fr` → `src/i18n/locales/*.json`  
Registered in `src/i18n/index.ts` (`resources`, `APP_LOCALES`, `resolveDeviceLocale`).

### Adding strings

1. Add keys to **`en.json` first** (source of truth).
2. Mirror into **every** other locale file (translate or temporary English — don’t ship missing keys).
3. Register new locale files in `src/i18n/index.ts`.
4. UI: `useTranslation()` + `t('namespace.key')` — no hard-coded user-facing English once a key exists.
5. Commit: `feat(i18n): …` with locale JSON + callers.

### In-app vs App Store locales (gotcha)

| In-app | ASC listing locale | Notes |
|--------|--------------------|--------|
| `en` | `en-US` | Default storefront |
| `en-GB` | `en-GB` | |
| `es` | `es-ES` | |
| `fr` | `fr-FR` | |
| `pt` | `pt-PT` | European Portuguese for store (not `pt-BR` unless we add it) |
| `hi` | `hi` | |
| `ne` | **none** | Nepali is **not** an ASC App Store locale — keep in-app only |

ASC metadata files live under `metadata/app-info/{locale}.json` and `metadata/version/1.0/{locale}.json`.  
They are **not** the same as `src/i18n/locales/*.json` — sync concepts (name/subtitle/description) manually.

### Store metadata workflow

```bash
# Local only until human says push
asc metadata validate   # expect 0 issues
# asc metadata push     # ONLY after explicit OK
```

- Keep listing name **Passport/ID Photo Maker** unless product asks to rename.
- Legal URLs (must be live before submit):  
  `https://www.codse.com/legal/passport-photo-print/privacy`  
  `https://www.codse.com/legal/passport-photo-print/terms`  
  Source pages live in **codse-website** repo (`src/app/legal/passport-photo-print/…`) — deploy that site separately; 404 until deployed.
- Don’t invent ASC locales for in-app-only languages (`ne`).

### Brand for ASO / koubou frames

Warm utilitarian (match `src/ui/tokens.ts`): cream `#FFFCF9`, accent ochre `#B8953F`, Figtree / Commissioner — not purple gradients / generic AI cream+serif.

---

## 5. App Store Connect — create app + IAP

### Checklist (new app)

1. **Paid Apps Agreement** + tax + banking **Active** (Business → Agreements). Nepal: **no US tax treaty** → leave Part III blank on W-8.
2. **Small Business Program** enroll (15% commission) — associated-account questions: all **No** if single org.
3. Create ASC app (bundle id must match `app.json` / Xcode).
4. Create **non-consumable** lifetime (or chosen) IAP → `scripts/setup-asc-lifetime.sh` pattern.
5. IAP review screenshot required for readiness.
6. Wire **RevenueCat** product → entitlement → offering (`$rc_lifetime` preferred).
7. EAS submit with `ascAppId` in `eas.json`.

### This app’s helper

```bash
source .secrets/asc.sh   # or scripts/asc-env.sh pattern
export APP_ID=6798807833
./scripts/setup-asc-lifetime.sh
```

RC setup: `./scripts/setup-revenuecat.sh` (needs `.secrets/rc.sh`).

### ASC CLI (`asc`) — prefer over clicking when possible

Examples (adjust flags to current `asc --help`):

```bash
asc apps list
asc iap list --app "$APP_ID" --paginate --output json
asc iap setup --app "$APP_ID" --type NON_CONSUMABLE …  # see setup-asc-lifetime.sh
asc validate iap --app "$APP_ID" --strict
asc builds list --app "$APP_ID"
```

Auth: API key via env from `.secrets/asc.sh` (`EXPO_ASC_*` / ASC key id + issuer + p8 path).

**Do not** commit p8 paths that are machine-absolute into tracked files; keep them in gitignored secrets.

---

## 6. Screenshots & ASO assets (store preview)

| Path | Role |
|------|------|
| `.asc/shots.settings.json` | Scheme, sim UDID, raw/framed dirs, upload flags |
| `screenshots/raw/{locale}/` | Raw sim captures (`home`, `size`, `crop`, `sheet`, `export`, `settings`) |
| `screenshots/koubou/` | Koubou YAML + HTML templates |
| `screenshots/fancy/iphone65/{lang}/` | Framed marketing slides ready for ASC |
| `metadata/` | ASC listing metadata (validate locally before push) |

### Size / device

- Target **IPHONE_65** → **1242×2688** (koubou / ASC).
- Prefer Cosmic Orange (or current product frame) — keep consistent across locales.
- Sim used for this app: iPhone 17 Pro UDID `D97585FB-CC31-4F07-BE56-FFCBDE5A0E19` (update per machine in `.asc/shots.settings.json`).

### Headless capture (Xcode beta / no Simulator.app)

When only Command Line Tools / Xcode-beta without Simulator.app:

```bash
export DEVELOPER_DIR=/Applications/Xcode-beta.app/Contents/Developer
# Boot sim via simctl / CoreSimulator; do not assume Simulator.app GUI
```

- **axe** (UI automation): if `axe` is a broken recursive shell wrapper, reinstall the real binary (e.g. under `~/.local/share/axe/`). Don’t debug the app until axe actually runs.
- **Route planting:** write an allowed route into the app container `Documents/shot-route.txt`, then relaunch. Reader lives in `app/_layout.tsx` (`SHOT_ROUTE_FILE`) — **allowlist only** (never arbitrary deep links from disk).

### Shot bootstrap — **reuse in every CODSE app** (locale + theme)

Canonical module: [`src/platform/shot-bootstrap.ts`](src/platform/shot-bootstrap.ts)  
(Host wiring: `app/_layout.tsx` allowlist + `scripts/plant-shot-route.sh`.)

Copy the module + plant script when spinning a new app. Extend the host allowlist and locale list; keep the **query contract** stable:

| Param | Aliases | Values | Effect |
|-------|---------|--------|--------|
| `lang` | `locale` | in-app or ASC tags (`es`, `es-ES`, …) | `setAppLocale` |
| `theme` | `appearance` | `light` \| `dark` \| `system` | `Appearance.setColorScheme` |
| path | — | allowlisted route | `router.replace` |

**Deep link**

```text
{scheme}://sheet?lang=es&theme=dark
{scheme}://export?locale=en-GB&appearance=light
```

**Headless plant** (`Documents/shot-route.txt`)

```bash
./scripts/plant-shot-route.sh <sim-udid> /sheet es dark
# multiline file also ok:
#   lang=fr
#   theme=light
#   /export
```

Apply **appearance + locale before navigate**, ideally also peek at cold start so the first paint is correct. Do not rely on koubou frame copy alone for localized or dark/light store previews.

When an app gains a real theme preference store, still honor shot bootstrap overrides for captures (don’t fight Settings during ASO runs).

### Localized UI captures

Do **not** only localize koubou frame copy — switch the **in-app** language (and theme when needed) via shot bootstrap above.

### Pipeline order (SISU / Affirmation-style)

1. Release or Debug build on the shot simulator.
2. For each storefront lang (and theme variant if needed): **plant route + lang [+ theme]**, relaunch, wait for UI, capture **raw**.
3. `kou setup-html` then koubou generate → `screenshots/fancy/iphone65/{lang}/`.
4. Localize marketing frame copy to match; in-phone UI should already match lang/theme.
5. Map koubou langs → ASC upload folders: `en`→`en-US`, `es`→`es-ES`, `fr`→`fr-FR`, `pt`→`pt-PT`, plus `en-GB`, `hi`. Skip `ne`.
6. Upload **only** when human asks (`upload_enabled` stays `false` by default).

### Koubou reminders

- Screenshots sell one outcome per slide — not documentation.
- Style-intake from real app tokens first (cream / ochre), then generate.
- Skills: `koubou` + `asc-shots-pipeline` / `asc-screenshot-resize` as needed.

### Do not

- Push metadata or screenshots to ASC without explicit OK.
- Treat in-app `ne` as a storefront locale.
- Rely on a stale sim UDID after Xcode upgrades — re-check `xcrun simctl list`.

---

## 7. Monetization

### Free vs Pro

| | Free | Pro (Lifetime) |
|--|------|----------------|
| Ads | Banner + post-export interstitial | None |
| Exports | **5 / calendar day** | Unlimited |
| People per sheet | **2 max** | Unlimited |

Caps live in `src/monetization/free-limits.ts`. Paywall: `app/pro.tsx`. `__DEV__` Force free applies the free caps even when entitlement is active.

**Daily export day key:** device-**local** `YYYY-MM-DD` in AsyncStorage. Count resets when the local calendar day changes (midnight, timezone travel, or clock edit). Soft freemium only — we don’t harden against clock-back.

**Paywall reason:** open with `openProPaywall('people'|'exports'|'ads')` or deep link `passportphotoprint://pro?reason=exports` (root deep-link handler must preserve `reason` — don’t bare-`replace('/pro')`).

### RevenueCat

- `__DEV__`: Test Store key `EXPO_PUBLIC_REVENUECAT_TEST_API_KEY` when set.
- Release / TestFlight: platform `appl_` / `goog_` keys only.
- Prefer `$rc_lifetime` package lookup.
- **Settings → Developer → Force free** (`__DEV__`) to test ads / free caps while Pro is unlocked.

### AdMob

| | |
|--|--|
| iOS app id | `ca-app-pub-3859855802547804~5410835231` |
| Banner | `…/3971816390` |
| Rewarded interstitial | `…/2171649565` |
| Android app id | `ca-app-pub-3859855802547804~6624257573` |

- Code: `src/monetization/ads.native.tsx` — Google `TestIds` when `__DEV__` or `EXPO_PUBLIC_ADMOB_USE_TEST_IDS=1`. **iOS live ads will not fill until the app is listed on the App Store** (Google policy) — keep `USE_TEST_IDS=1` + `ALLOW_FORCE_FREE=1` on TF builds; flip both off/0 for the App Store binary. Pro suppresses ads; Settings → Force free works when `ALLOW_FORCE_FREE=1`.
- Changing `GADApplicationIdentifier` / plugin app ids → **new native build**.
- AdMob (and similar SDKs) may link Core Location → Apple **ITMS-90683** if `NSLocationWhenInUseUsageDescription` is missing. Keep a purpose string in `app.json` → `ios.infoPlist` even though photo features never request location.
- Placements: home/sheet banners; interstitial after export (cooldown).

### Engagement

- `expo-store-review` after N exports; Settings share/rate rows.
- App Store URL in `app.json` → `ios.appStoreUrl`.

---

## 8. EAS / TestFlight

- Profiles in `eas.json`; submit uses `ascAppId`.
- After big native/env changes (AdMob app id, RC keys, new native modules): **new EAS production build + submit**, don’t rely on stale TF binaries.
- Boot: splash can force-ready after timeout so hung font/i18n doesn’t black-screen forever (`app/_layout.tsx`).
- **Release blank screen (CODSE gotcha):** `react-i18next` defaults `useSuspense: true`. Calling `useTranslation()` in the same root component that runs `initI18n()` in `useEffect` suspends before that effect runs → permanent blank in TestFlight/App Store (DEV often “works” via HMR-warmed i18n). Fix: `react: { useSuspense: false }` in `initI18n`, and keep boot gate free of `useTranslation` (split navigator). Also honor `fontError` from `useFonts` + splash force timeout.
- **Nested Stack under NativeTabs (SDK 57 / RN 0.86):** a `Stack` inside `app/(tabs)/…/_layout.tsx` can hang **Release only** (dev/Metro OK) — splash fades then black window (expo#47687). Keep tab screens flat (`app/(tabs)/index.tsx`, `settings.tsx`); put Settings legal/help routes on the **root** Stack (`app/help.tsx`, `faq`, `about`, `privacy`, `terms`, `disclaimer`) with `headerBackTitle: settings`.
- **Missing SceneDelegate in EAS binary (black screen):** `ios/` is gitignored. If `app.json` → `ios.infoPlist.UIApplicationSceneManifest` points at `$(PRODUCT_MODULE_NAME).SceneDelegate` but that Swift file is never added by prebuild, the IPA’s Info.plist references a **class that is not in the binary** → UIKit shows an empty black scene window (verified: build 13 had SceneManifest, `strings` had no `SceneDelegate`). Always ship via `plugins/with-ios-scene-delegate.js` (writes `SceneDelegate.swift` + AppDelegate that only creates the RN factory; scene starts RN). Never add the plist key without the plugin.
- **Startup (Expo/RN practices):**
  - Critical fonts only on boot (Figtree). Commissioner (paywall display) via `ensureDisplayFonts()` after first paint / on Pro mount.
  - Defer AdMob + RevenueCat with `InteractionManager.runAfterInteractions` after splash hide — never on the critical path.
  - `Purchases.configure` must not `await getCustomerInfo()` (network); warm cache in background.
  - Splash: `setOptions({ fade: true })` then `hideAsync` when boot-ready.
  - Metro: `inlineRequires: true` in `metro.config.js` for faster cold start.

---

## 9. UI conventions (this product)

- Home/Settings: iOS grouped gray `#F2F2F7`, inset groups, system-ish list type on iOS.
- Native tabs: Home + Settings (`expo-router/unstable-native-tabs`).
- Legal/help on **root** Stack (not under tabs) so Release doesn’t hang; `headerBackTitle` = Settings.
- Accent: soft ochre `#B8953F` — don’t regress to neon orange.
- Granular UI polish → commit as `style(ui): …` or `feat(home): …`.

---

## 10. New CODSE app checklist (copy this)

1. Fork/copy this playbook into the new repo’s `AGENTS.md`.
2. New bundle id + ASC app + Paid Apps + Small Business.
3. Expo `app.json` / EAS project / icons / splash.
4. i18n scaffold (`src/i18n`) + `en.json`.
5. Copy **shot bootstrap** (`src/platform/shot-bootstrap.ts` + plant script + root allowlist) for locale/theme captures.
6. RC project + entitlement + offering.
7. AdMob iOS/Android apps + units in `app.json` + `ads.native.tsx`.
8. `.secrets/` + `.env.example` (no Metro-poisoning secret filenames).
9. Screenshot dirs + `.asc/shots.settings.json`.
10. First EAS build → TestFlight → smoke (launch, IAP, ads with force-free).
11. Keep committing granularly from day one.

---

## 11. When you learn something new

Append a short dated bullet under the right section (or add a section). Prefer **commands + IDs + file paths** over theory. Delete stale IDs when replaced.

# AGENTS.md — CODSE Expo / App Store playbook

This repo (`passport-photo-print`) is the **template** for future CODSE consumer apps. Agents must follow this file without being reminded.

Related always-on Cursor rules: `.cursor/rules/*.mdc`.

---

## 0. Non-negotiables

1. **Commit frequently** — after every logical unit (feature slice, fix, i18n keys, ASC script, token change). Conventional Commits. Stage **specific files** only (`git add path`), never `git add -A` / `.`.
2. **Do not wait** for the human to say “commit”. If a unit is done and the tree is dirty with intentional work, commit it.
3. **Never commit secrets** — `.env`, `.secrets/`, `*.p8`, `eas.submit.local.json`, AuthKeys, absolute machine paths to keys.
4. **Do not push** unless the human asks.
5. Prefer **`.native` / `.web`** platform splits over ambiguous stubs that Metro can mis-resolve.
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
| Lifetime IAP | `com.codse.passport.photo.print.lifetime` |
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

**Locales:** `en`, `en-GB`, `pt`, `ne`, `hi`, `es`, `fr` in `src/i18n/locales/*.json`.

### Adding strings

1. Add keys to **`en.json` first** (source of truth).
2. Mirror into other locale files (translate or temporary English — don’t leave missing keys if the screen ships).
3. Register new locale files in `src/i18n/index.ts` (`resources` + `APP_LOCALES` + `resolveDeviceLocale`).
4. UI: `useTranslation()` + `t('namespace.key')` — no hard-coded user-facing English in screens once a key exists.
5. Commit: `feat(i18n): …` with locale JSON + callers.

### App Store metadata locales

Separate from in-app i18n: `metadata/app-info/*.json` (ASC listing copy). Keep in sync conceptually (name/description) but they are **not** the same files.

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

## 6. Screenshots & ASO assets

| Path | Role |
|------|------|
| `.asc/shots.settings.json` | Shot pipeline config (scheme, sim UDID, dirs) |
| `screenshots/raw/` | Raw captures |
| `screenshots/fancy/` | Framed marketing shots |
| `screenshots/koubou/` | Koubou templates / strings |
| `metadata/` | ASC listing metadata |

Pipeline notes:

- Prefer **asc shots** / koubou skills when generating App Store screenshots.
- Config points at Xcode scheme `PassportPhotoPrint` and a simulator UDID — update UDID per machine.
- Upload to ASC only when `upload_enabled` / human asks — don’t spam ASC from agents.

ASC localization metadata lives under `metadata/app-info/` and `metadata/version/`.

---

## 7. Monetization

### RevenueCat

- `__DEV__`: Test Store key `EXPO_PUBLIC_REVENUECAT_TEST_API_KEY` when set.
- Release / TestFlight: platform `appl_` / `goog_` keys only.
- Prefer `$rc_lifetime` package lookup.
- **Settings → Developer → Force free** (`__DEV__`) to test ads while Pro is unlocked.

### AdMob

| | |
|--|--|
| iOS app id | `ca-app-pub-3859855802547804~5410835231` |
| Banner | `…/3971816390` |
| Rewarded interstitial | `…/2171649565` |
| Android app id | `ca-app-pub-3859855802547804~6624257573` |

- Code: `src/monetization/ads.native.tsx` — test IDs in `__DEV__` unless `EXPO_PUBLIC_ADMOB_USE_TEST_IDS=0`.
- Changing `GADApplicationIdentifier` / plugin app ids → **new native build**.
- Placements: home/sheet banners; interstitial after export (cooldown); optional rewarded “ads off 1h”.

### Engagement

- `expo-store-review` after N exports; Settings share/rate rows.
- App Store URL in `app.json` → `ios.appStoreUrl`.

---

## 8. EAS / TestFlight

- Profiles in `eas.json`; submit uses `ascAppId`.
- After big native/env changes (AdMob app id, RC keys, new native modules): **new EAS production build + submit**, don’t rely on stale TF binaries.
- Boot: splash can force-ready after timeout so hung font/i18n doesn’t black-screen forever (`app/_layout.tsx`).

---

## 9. UI conventions (this product)

- Home/Settings: iOS grouped gray `#F2F2F7`, inset groups, system-ish list type on iOS.
- Native tabs: Home + Settings (`expo-router/unstable-native-tabs`).
- Legal/help nested under Settings stack so back title ≠ `(tabs)`.
- Accent: soft ochre `#B8953F` — don’t regress to neon orange.
- Granular UI polish → commit as `style(ui): …` or `feat(home): …`.

---

## 10. New CODSE app checklist (copy this)

1. Fork/copy this playbook into the new repo’s `AGENTS.md`.
2. New bundle id + ASC app + Paid Apps + Small Business.
3. Expo `app.json` / EAS project / icons / splash.
4. i18n scaffold (`src/i18n`) + `en.json`.
5. RC project + entitlement + offering.
6. AdMob iOS/Android apps + units in `app.json` + `ads.native.tsx`.
7. `.secrets/` + `.env.example` (no Metro-poisoning secret filenames).
8. Screenshot dirs + `.asc/shots.settings.json`.
9. First EAS build → TestFlight → smoke (launch, IAP, ads with force-free).
10. Keep committing granularly from day one.

---

## 11. When you learn something new

Append a short dated bullet under the right section (or add a section). Prefer **commands + IDs + file paths** over theory. Delete stale IDs when replaced.

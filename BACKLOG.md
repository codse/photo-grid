# Passport Photo Print — backlog

Shippable chunks to pick up later. Not a commitment order — grab whatever’s highest leverage.

## Next big chunks

### i18n / translations
Refactor the whole app for localization, then ship at least:

- English (`en`)
- Hindi (`hi`)
- Spanish (`es`)
- French (`fr`)
- Portuguese (`pt`)
- Nepali (`ne`)

Likely stack for Expo: `expo-localization` + `i18next` / `react-i18next` (or `expo-router`–friendly equivalent). Extract all user-facing strings (screens, alerts, a11y labels, presets, App Store metadata later). Support RTL only if we add Arabic later — none of the v1 locales need it.

### Multi-select “Tile ready” → sheet
Pick several library photos at once and land on the sheet without per-person crop first.

### Custom mm size
Manual width × height entry beyond presets.

### Face / head compliance guides
Passport-style head-size / eye-line overlays on crop (and maybe camera).

## Notes
- Saved **presets** = named print configs (size/paper/packing). Saved **sheets** = exported PNG archives. Don’t conflate.
- Prefer platform files (`.native` / `.web`) over `.ts` stubs that re-export web — Metro can ship the wrong UI.

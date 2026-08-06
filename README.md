# Passport Photo Print

Passport / ID photo grid printer — Expo (iOS, Android, web). Multi-person sheets, mixed sizes, on-device processing. No uploads.

## Run

```bash
npm install
npx expo start
```

- **Web:** `npx expo start --web`
- **iOS/Android (Vision Camera + on-device BG removal):** needs a **dev client** (not Expo Go):

```bash
npx expo prebuild
npx expo run:ios
# or
npx expo run:android
```

## Flow

1. Home: **Take photo** / **Choose from library** / **Tile ready photos** (skip crop)
2. Soft size default — tap to change on `/size`
3. Crop (optional), then sheet with exact copy count + cut guides
4. Export PNG/PDF → print at **Actual size / Uncropped**
5. **iOS/Android only:** exports also land in **Saved sheets** (`/saved`) for later revisit

## Architecture

- `src/core` — pure TS (presets, shelf packer, crop math, units)
- `src/platform/*.native.ts(x)` / `*.web.ts(x)` — camera, render, BG removal
- `app/` — Expo Router screens only
- On-device BG: Apple Vision + ML Kit via `rn-remove-image-bg` (not IMG.LY / no upload APIs)

## Privacy

Photos never leave the device. Background removal is optional and local — some agencies reject digitally altered photos.

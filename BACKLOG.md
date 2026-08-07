# Passport Photo Print — backlog

Shippable chunks. Checkmarks = done in product.

## Progress vs old “real product gaps”

| Gap | Status |
|-----|--------|
| Sheet/export preview ignores crop | **Done** — sheet uses `CroppedImagePreview` / `AdjustedCropImage` |
| Native adjust preview on crop | Partial — Adjust modal + export; crop canvas filters still web-first |
| Multi-select “Tile ready” | Open |
| Custom mm size | Open |
| Face / eye-line / head-height guides | Open |
| Monetization (Pro / ads) | **In app** — RevenueCat wired; ASC IAP + RC keys still needed |
| EAS profiles | **Done** (`eas.json`) |
| TestFlight / Play | **Blocked** — no ASC app record yet; needs `asc web auth login` |
| Privacy / Terms / About | In progress |
| i18n | In progress |
| Screenshots / ASO | Open |
| Packer / crop-math tests | Open |
| BG→white flatten quality | Open |
| Onboarding depth | Open |

## IAP decision

**Use RevenueCat** (already integrated), not raw StoreKit-only.

- One $9.99 lifetime is simple enough for native IAP alone.
- RC still wins here: restore, entitlement cache for ads gate, live `priceString`, dashboard, less receipt glue.
- Keep native product id `com.codse.passport.photo.print.lifetime` + entitlement `pro`.

Blocked until:
1. ASC app exists for `com.codse.passport.photo.print`
2. Non-consumable IAP created + Paid Apps agreement
3. RC product + offering + `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`

## Next big chunks

### i18n / translations
Locales: `en` (US), `en-GB`, `pt`, `ne`, `hi`, `es`, `fr`.

### Multi-select “Tile ready” → sheet
### Custom mm size
### Face / head compliance guides

## Notes
- Saved **presets** = named print configs. **Saved** = bookmarked sheet PNGs.
- Prefer `.native` / `.web` over ambiguous `.ts` re-exports.

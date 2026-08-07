#!/usr/bin/env bash
# Plant Documents/shot-route.txt for localized / themed captures.
#
# Usage:
#   ./scripts/plant-shot-route.sh <sim-udid> <route> [lang] [theme]
#
# Examples:
#   ./scripts/plant-shot-route.sh D97585FB-… /sheet es
#   ./scripts/plant-shot-route.sh D97585FB-… /sheet es dark
#   ./scripts/plant-shot-route.sh D97585FB-… '/sheet?lang=fr&theme=light'
#   ./scripts/plant-shot-route.sh D97585FB-… /export en-GB system
#
# theme: light | dark | system
# Then terminate + relaunch so RootLayout reads the file.
set -euo pipefail

UDID="${1:?simulator UDID}"
ROUTE="${2:?route e.g. /sheet}"
LANG_OPT="${3:-}"
THEME_OPT="${4:-}"

BUNDLE_ID="${BUNDLE_ID:-com.codse.passport.photo.print}"
export DEVELOPER_DIR="${DEVELOPER_DIR:-/Applications/Xcode-beta.app/Contents/Developer}"

DATA_DIR=$(xcrun simctl get_app_container "$UDID" "$BUNDLE_ID" data 2>/dev/null || true)
if [[ -z "${DATA_DIR}" ]]; then
  echo "error: app data container not found for $BUNDLE_ID on $UDID" >&2
  echo "Install/launch the app on that simulator first." >&2
  exit 1
fi

DOC="${DATA_DIR}/Documents"
mkdir -p "$DOC"
OUT="${DOC}/shot-route.txt"

if [[ "$ROUTE" == *\?* ]]; then
  printf '%s\n' "$ROUTE" >"$OUT"
else
  : >"$OUT"
  if [[ -n "$LANG_OPT" ]]; then
    printf 'lang=%s\n' "$LANG_OPT" >>"$OUT"
  fi
  if [[ -n "$THEME_OPT" ]]; then
    printf 'theme=%s\n' "$THEME_OPT" >>"$OUT"
  fi
  printf '%s\n' "$ROUTE" >>"$OUT"
fi

echo "Planted $OUT:"
cat "$OUT"
echo
echo "Relaunch: xcrun simctl terminate $UDID $BUNDLE_ID && xcrun simctl launch $UDID $BUNDLE_ID"

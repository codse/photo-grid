#!/usr/bin/env bash
# Plant Documents/shot-route.txt on a booted simulator for localized captures.
#
# Usage:
#   ./scripts/plant-shot-route.sh <sim-udid> <route> [lang]
#
# Examples:
#   ./scripts/plant-shot-route.sh D97585FB-… /sheet es
#   ./scripts/plant-shot-route.sh D97585FB-… '/sheet?lang=fr'
#   ./scripts/plant-shot-route.sh D97585FB-… /export en-GB
#
# Then terminate + relaunch the app so RootLayout reads the file.
set -euo pipefail

UDID="${1:?simulator UDID}"
ROUTE="${2:?route e.g. /sheet}"
LANG_OPT="${3:-}"

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

if [[ -n "$LANG_OPT" ]]; then
  if [[ "$ROUTE" == *\?* ]]; then
    printf '%s\n' "$ROUTE" >"$OUT"
  else
    printf 'lang=%s\n%s\n' "$LANG_OPT" "$ROUTE" >"$OUT"
  fi
else
  printf '%s\n' "$ROUTE" >"$OUT"
fi

echo "Planted $OUT:"
cat "$OUT"
echo
echo "Relaunch: xcrun simctl terminate $UDID $BUNDLE_ID && xcrun simctl launch $UDID $BUNDLE_ID"

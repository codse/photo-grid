#!/usr/bin/env bash
# Regenerate Expo / Android / splash / favicon assets from a square master logo.
# Usage: ./scripts/gen-icons.sh [path-to-logo.png]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="${1:-$ROOT/assets/logo-source.png}"
OUT="$ROOT/assets"
BG="#D1A43E"
CREAM="#FFFCF9"

if [[ ! -f "$SRC" ]]; then
  echo "missing logo: $SRC" >&2
  exit 1
fi
command -v magick >/dev/null || { echo "ImageMagick (magick) required" >&2; exit 1; }

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

magick "$SRC" -resize 1024x1024 -strip "$TMP/logo-alpha.png"
magick "$TMP/logo-alpha.png" -background "$BG" -alpha remove -alpha off -depth 8 PNG32:"$OUT/icon.png"
magick -size 1024x1024 "xc:$CREAM" \
  \( "$TMP/logo-alpha.png" -resize 640x640 \) \
  -gravity center -compose over -composite -depth 8 PNG32:"$OUT/splash-icon.png"
magick "$OUT/icon.png" -resize 48x48 -depth 8 PNG32:"$OUT/favicon.png"
magick -size 1024x1024 xc:none \
  \( "$TMP/logo-alpha.png" -resize 672x672 \) \
  -gravity center -compose over -composite -depth 8 PNG32:"$OUT/android-icon-foreground.png"
magick -size 1024x1024 "xc:$BG" -depth 8 PNG32:"$OUT/android-icon-background.png"
magick "$TMP/logo-alpha.png" -colorspace Gray -alpha extract \
  \( +clone -fill white -colorize 100 \) \
  -compose CopyOpacity -composite \
  -resize 672x672 \
  \( -size 1024x1024 xc:none \) +swap -gravity center -compose over -composite \
  -depth 8 PNG32:"$OUT/android-icon-monochrome.png"

# Refresh committed source if caller passed a new file
if [[ "$SRC" != "$OUT/logo-source.png" ]]; then
  magick "$SRC" -resize 1024x1024 -strip -depth 8 PNG32:"$OUT/logo-source.png"
fi

echo "Wrote icons under $OUT"
identify "$OUT/icon.png" "$OUT/splash-icon.png" "$OUT/favicon.png" \
  "$OUT/android-icon-foreground.png" "$OUT/android-icon-background.png" \
  "$OUT/android-icon-monochrome.png"

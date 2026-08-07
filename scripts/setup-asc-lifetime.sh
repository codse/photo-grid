#!/usr/bin/env bash
# Create ASC non-consumable Lifetime @ $9.99 for Passport Photo Print.
#
# Required: APP_ID (ASC numeric app id after the app exists)
# Product: com.codse.passport.photo.print.lifetime

set -euo pipefail

APP_ID="${APP_ID:?Set APP_ID to the App Store Connect app id}"
PRODUCT_ID="com.codse.passport.photo.print.lifetime"
REF_NAME="Lifetime"
REVIEW_SHOT="${REVIEW_SHOT:-./assets/icon.png}"

mkdir -p ./audit

echo "==> List existing IAPs"
EXISTING="$(asc iap list --app "$APP_ID" --paginate --output json)"

IAP_ID="$(echo "$EXISTING" | python3 -c "
import json,sys
d=json.load(sys.stdin)
for item in d.get('data') or []:
  if item.get('attributes',{}).get('productId')=='$PRODUCT_ID':
    print(item['id']); break
")"

if [[ -z "$IAP_ID" ]]; then
  echo "==> Creating NON_CONSUMABLE $PRODUCT_ID @ \$9.99"
  CREATE="$(asc iap setup \
    --app "$APP_ID" \
    --type NON_CONSUMABLE \
    --reference-name "$REF_NAME" \
    --product-id "$PRODUCT_ID" \
    --display-name "Lifetime" \
    --description "Remove ads forever with a one-time purchase." \
    --locale en-US \
    --price "9.99" \
    --base-territory "United States" \
    --no-verify \
    --output json)"
  echo "$CREATE" | python3 -m json.tool
  IAP_ID="$(echo "$CREATE" | python3 -c "
import json,sys
d=json.load(sys.stdin)
print(d.get('iapId') or (d.get('data') or {}).get('id') or d.get('id') or '')
")"
else
  echo "==> Reusing IAP $IAP_ID"
fi

if [[ -z "$IAP_ID" ]]; then
  echo "Could not resolve IAP id" >&2
  exit 1
fi

VER_JSON="$(asc iap versions list --iap-id "$IAP_ID" --state PREPARE_FOR_SUBMISSION --paginate --output json)"
VER_ID="$(echo "$VER_JSON" | python3 -c "
import json,sys
d=json.load(sys.stdin)
items=d.get('data') or []
print(items[0]['id'] if items else '')
")"

if [[ -z "$VER_ID" ]]; then
  VER_ID="$(asc iap versions create --iap-id "$IAP_ID" --output json | python3 -c "import json,sys; print(json.load(sys.stdin)['data']['id'])")"
fi

# Review screenshot (required for IAP submission readiness)
if [[ -f "$REVIEW_SHOT" ]]; then
  echo "==> Review screenshot → $VER_ID"
  asc iap versions images create --version-id "$VER_ID" --file "$REVIEW_SHOT" --output json 2>&1 | head -40 || \
  asc iap review-screenshots create --iap-id "$IAP_ID" --file "$REVIEW_SHOT" --output json 2>&1 | head -40 || true
fi

asc validate iap --app "$APP_ID" --strict --output json --pretty > ./audit/iap-validation.json || true
echo "Wrote ./audit/iap-validation.json"
echo "IAP_ID=$IAP_ID PRODUCT_ID=$PRODUCT_ID"

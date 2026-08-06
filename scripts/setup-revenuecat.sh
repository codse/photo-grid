#!/usr/bin/env bash
# Scaffold RevenueCat for Passport Photo Print (API v2).
#
# Required:
#   REVENUECAT_API_KEY     sk_... (project config write)
#   REVENUECAT_PROJECT_ID  proj...
#   REVENUECAT_IOS_APP_ID  app... (from RC Apps)
#
# Product / entitlement match src/monetization/catalog.ts

set -euo pipefail

API="https://api.revenuecat.com/v2"
ENTITLEMENT_KEY="pro"
LIFETIME="com.codse.passport.photo.print.lifetime"

die() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }
need() { [[ -n "${!1:-}" ]] || die "Missing env: $1"; }

need REVENUECAT_API_KEY
need REVENUECAT_PROJECT_ID
need REVENUECAT_IOS_APP_ID

auth=(-H "Authorization: Bearer $REVENUECAT_API_KEY" -H "Content-Type: application/json")

rc() {
  local method="$1" path="$2"
  shift 2
  curl -sS -X "$method" "${auth[@]}" "$API$path" "$@"
}

echo "==> Entitlement $ENTITLEMENT_KEY"
rc POST "/projects/$REVENUECAT_PROJECT_ID/entitlements" \
  -d "{\"lookup_key\":\"$ENTITLEMENT_KEY\",\"display_name\":\"Pro\"}" | python3 -m json.tool || true

echo "==> Lifetime product $LIFETIME"
rc POST "/projects/$REVENUECAT_PROJECT_ID/products" \
  -d "{\"store_identifier\":\"$LIFETIME\",\"app_id\":\"$REVENUECAT_IOS_APP_ID\",\"type\":\"non_consumable\",\"display_name\":\"Lifetime\"}" \
  | python3 -m json.tool || true

echo "==> Products"
rc GET "/projects/$REVENUECAT_PROJECT_ID/products" | python3 -m json.tool || true

cat <<EOF

Finish in RevenueCat dashboard:
  1) Entitlement \`$ENTITLEMENT_KEY\` → attach $LIFETIME
  2) Offering \`default\` → lifetime package → $LIFETIME (Current)
  3) Copy public iOS key → EXPO_PUBLIC_REVENUECAT_IOS_API_KEY
EOF

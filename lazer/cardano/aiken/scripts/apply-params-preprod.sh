#!/usr/bin/env bash
# Apply validator parameter `stable_assets` (Plutus list of (policyId, assetName) pairs).
# Default: empty list CBOR 0x80 — only ADA counts toward the goal.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PARAM_HEX_FILE="${PARAM_HEX_FILE:-$ROOT/../params/stable_assets.empty.hex}"
# Strip whitespace / comments
HEX="$(tr -d '[:space:]' < "$PARAM_HEX_FILE" | sed 's/#.*//')"

if [[ ! "$HEX" =~ ^[0-9a-fA-F]+$ ]]; then
  echo "Invalid hex in $PARAM_HEX_FILE" >&2
  exit 1
fi

aiken blueprint apply -m iron_pig -v iron_pig -i plutus.json -o plutus.applied.json "$HEX"
echo "Wrote plutus.applied.json (add to .gitignore if you track secrets there)."

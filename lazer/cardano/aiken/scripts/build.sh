#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
aiken check -D
aiken build
echo "Built plutus.json — next: ./scripts/apply-params-preprod.sh"

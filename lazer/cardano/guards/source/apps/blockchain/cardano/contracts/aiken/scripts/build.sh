#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ARTIFACTS_DIR="${PROJECT_DIR}/artifacts"
MODULE_NAME="${POLICY_VAULT_MODULE:-policy_vault}"
VALIDATOR_NAME="${POLICY_VAULT_VALIDATOR:-policy_vault}"
HASH_FILE="${POLICY_VAULT_HASH_FILE:-${ARTIFACTS_DIR}/policy_vault.hash}"

"${SCRIPT_DIR}/doctor.sh" build

cd "$PROJECT_DIR"
printf 'Running aiken build in %s\n' "$PROJECT_DIR"
aiken build
mkdir -p "$ARTIFACTS_DIR"
aiken blueprint convert \
  --module "$MODULE_NAME" \
  --validator "$VALIDATOR_NAME" \
  . > "${ARTIFACTS_DIR}/policy_vault.plutus"
aiken blueprint hash \
  --module "$MODULE_NAME" \
  --validator "$VALIDATOR_NAME" \
  . > "$HASH_FILE"

printf '\nBlueprint ready at %s/plutus.json\n' "$PROJECT_DIR"
printf 'Cardano CLI artifact exported to %s/policy_vault.plutus\n' "$ARTIFACTS_DIR"
printf 'Script hash exported to %s\n' "$HASH_FILE"
printf 'Next: run derive-address.sh to compute the preprod address.\n'

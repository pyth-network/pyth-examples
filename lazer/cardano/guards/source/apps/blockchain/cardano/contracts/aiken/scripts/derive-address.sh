#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ARTIFACTS_DIR="${PROJECT_DIR}/artifacts"
MODULE_NAME="${POLICY_VAULT_MODULE:-policy_vault}"
VALIDATOR_NAME="${POLICY_VAULT_VALIDATOR:-policy_vault}"
ADDRESS_FILE="${POLICY_VAULT_ADDRESS_FILE:-${ARTIFACTS_DIR}/policy_vault.addr}"
HASH_FILE="${POLICY_VAULT_HASH_FILE:-${ARTIFACTS_DIR}/policy_vault.hash}"

mkdir -p "$ARTIFACTS_DIR"

"${SCRIPT_DIR}/doctor.sh" address

cd "$PROJECT_DIR"
aiken blueprint address \
  --module "$MODULE_NAME" \
  --validator "$VALIDATOR_NAME" \
  . > "$ADDRESS_FILE"

aiken blueprint hash \
  --module "$MODULE_NAME" \
  --validator "$VALIDATOR_NAME" \
  . > "$HASH_FILE"

printf 'PolicyVault address written to %s\n' "$ADDRESS_FILE"
printf 'PolicyVault hash written to %s\n' "$HASH_FILE"

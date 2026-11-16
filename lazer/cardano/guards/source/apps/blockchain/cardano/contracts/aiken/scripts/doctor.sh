#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

missing=0
mode="${1:-full}"

check_binary() {
  local name="$1"
  if command -v "$name" >/dev/null 2>&1; then
    printf 'OK   %s -> %s\n' "$name" "$(command -v "$name")"
  else
    printf 'MISS %s is not installed or not on PATH\n' "$name" >&2
    missing=1
  fi
}

printf 'guards.one Cardano contract doctor\n'
printf 'project: %s\n' "$PROJECT_DIR"

check_binary aiken

printf '\nEnvironment\n'
printf 'CARDANO_NETWORK=%s\n' "${CARDANO_NETWORK:-preprod}"
printf 'CARDANO_TESTNET_MAGIC=%s\n' "${CARDANO_TESTNET_MAGIC:-1}"
printf 'PYTH_PREPROD_POLICY_ID=%s\n' "${PYTH_PREPROD_POLICY_ID:-unset}"

if [[ $missing -ne 0 ]]; then
  printf '\nToolchain incomplete for mode=%s.\n' "$mode" >&2
  exit 1
fi

printf '\nToolchain looks usable for Aiken blueprint build/address tasks.\n'

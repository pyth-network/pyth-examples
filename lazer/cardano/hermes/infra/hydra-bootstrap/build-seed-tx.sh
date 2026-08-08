#! /bin/bash
# Build + sign the Hydra offline-head seed tx for Preprod (--testnet-magic 1).
# Tx layout follows infra/hydra-bootstrap/entrypoint.sh: cardano-cli latest transaction build-raw, then sign, then cat.
# Run from repo host with Docker (entrypoint runs cardano-cli inside its image; we invoke the same CLI via docker run).
#
# No --tx-out-reference-script-file: cardano-cli’s reference-script CBOR does not match Hydra 1.3’s ledger check
# (ConwayUtxowFailure MalformedReferenceScripts). The Pyth UTxO carries inline datum + tokens only; attach Plutus
# in L2 txs explicitly (e.g. Lucid attach.WithdrawalValidator / attach.Script) instead of readFrom scriptRef.

set -euo pipefail

BOOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA="$(cd "${BOOT}/.." && pwd)"

CARDANO_IMAGE="${CARDANO_IMAGE:-ghcr.io/intersectmbo/cardano-node:10.1.4}"

cardano_cli() {
  docker run --rm --user "$(id -u):$(id -g)" --entrypoint cardano-cli \
    -v "${INFRA}:/work" -w /work/hydra-bootstrap \
    "${CARDANO_IMAGE}" "$@"
}

# Preprod (not the devnet 42 from entrypoint.sh)
testnet_magic="${TESTNET_MAGIC:-1}"

# Define the UTxO details and amounts (initial-utxo-set.json fiction #0)
tx_in1="0000000000000000000000000000000000000000000000000000000000000000#0"
tx_in_lovelace=100000000041175
fee=41175
# Remaining lovelace to the Pyth script output after fee
out_lovelace=$((tx_in_lovelace - fee))

policy_id="d799d287105dea9377cdf9ea8502a83d2b9eb2d2050a8aea800a21e6"
asset_name_hex="50797468205374617465"
# Must match submit-seed-tx.sh PYTH_OUTPUT_ADDR
pyth_script_address="${PYTH_OUTPUT_ADDR:-addr_test1wrm3tr5zpw9k2nefjtsz66wfzn6flnphr5kd6ak9ufrl3wcqqfyn8}"

tx_out="${pyth_script_address}+${out_lovelace}+1 ${policy_id}.${asset_name_hex}"

signing_key="${SEED_SIGNING_KEY:-${INFRA}/credentials/hydra-funds.sk}"
if [[ "${signing_key}" != "${INFRA}"/* ]]; then
  echo "Signing key must be under ${INFRA}" >&2
  exit 1
fi
signing_key_container="/work/${signing_key#"${INFRA}"/}"

# Inline datum CBOR (hex) — same as seed-output-datum.hex
datum_hex="$(tr -d ' \n\t' < "${SEED_DATUM_HEX_FILE:-${BOOT}/seed-output-datum.hex}")"
if command -v xxd >/dev/null 2>&1; then
  printf '%s' "${datum_hex}" | xxd -r -p > "${BOOT}/seed-output-datum.cbor"
else
  python3 -c "import sys,binascii; sys.stdout.buffer.write(binascii.unhexlify(sys.argv[1]))" "${datum_hex}" > "${BOOT}/seed-output-datum.cbor"
fi

tx_raw="/work/hydra-bootstrap/seed.body.json"
tx_signed="/work/hydra-bootstrap/seed.witnessed.json"

# Build the raw transaction (cf. entrypoint.sh — build-raw, then fee, then out-file)
echo "Building raw transaction..."
cardano_cli latest transaction build-raw \
  --tx-in "${tx_in1}" \
  --tx-out "${tx_out}" \
  --tx-out-inline-datum-cbor-file seed-output-datum.cbor \
  --protocol-params-file /work/protocol-parameters.json \
  --fee "${fee}" \
  --out-file "${tx_raw}"

# Sign the transaction (Preprod testnet-magic)
echo "Signing transaction (Preprod testnet-magic ${testnet_magic})..."
cardano_cli latest transaction sign \
  --tx-body-file "${tx_raw}" \
  --signing-key-file "${signing_key_container}" \
  --testnet-magic "${testnet_magic}" \
  --out-file "${tx_signed}"

cp "${BOOT}/seed.witnessed.json" "${INFRA}/seed-spend.signed.json"
cp "${BOOT}/seed.body.json" "${BOOT}/seed-spend.raw"

echo "Wrote ${INFRA}/seed-spend.signed.json and ${BOOT}/seed-spend.raw"
cat "${INFRA}/seed-spend.signed.json"

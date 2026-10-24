#!/bin/sh
set -eu

# Keep sentinel under persistence/ so `rm -rf persistence/` or a fresh volume wipes it.
# (A file at /devnet/.hydra-seed-tx.done survives `docker compose down -v` because ./ is a bind mount.)
SENTINEL=/devnet/persistence/.hydra-seed-tx.done
PYTH_SETUP_TX_ADDR=/devnet/seed-spend.signed.json
INITIAL_UTXO_REF='0000000000000000000000000000000000000000000000000000000000000000#0'
PYTH_OUTPUT_ADDR='addr_test1wrm3tr5zpw9k2nefjtsz66wfzn6flnphr5kd6ak9ufrl3wcqqfyn8'

HYDRA_HTTP_HOST="${HYDRA_HTTP_HOST:-hydra-node}"
HYDRA_HTTP_PORT="${HYDRA_HTTP_PORT:-4011}"
WS_URL="${HYDRA_WS_URL:-ws://${HYDRA_HTTP_HOST}:${HYDRA_HTTP_PORT}}"
MAX_WAIT="${SEED_TX_MAX_WAIT:-180}"

if [ ! -f "$PYTH_SETUP_TX_ADDR" ]; then
  echo "Missing $PYTH_SETUP_TX_ADDR" >&2
  exit 1
fi

mkdir -p /devnet/persistence

if [ -f "$SENTINEL" ]; then
  echo "Seed tx already submitted ($(basename "$SENTINEL") exists)."
  exit 0
fi

apk add --no-cache curl jq ca-certificates websocat >/dev/null

api_root() {
  curl -sf "http://${HYDRA_HTTP_HOST}:${HYDRA_HTTP_PORT}$1" || true
}

echo "Waiting for Hydra HTTP API (protocol-parameters)..."
n=0
until api_root /protocol-parameters | jq -e . >/dev/null 2>&1; do
  n=$((n + 1))
  if [ "$n" -ge "$MAX_WAIT" ]; then
    echo "Timeout waiting for Hydra API." >&2
    exit 1
  fi
  sleep 1
done

echo "Waiting for initial UTxO with ref ${INITIAL_UTXO_REF} in /snapshot/utxo..."
n=0
while true; do
  body=$(api_root /snapshot/utxo)
  if echo "$body" | jq -e --arg k "$INITIAL_UTXO_REF" --arg a "$PYTH_OUTPUT_ADDR" '
      type == "object"
      and (has($k) | not)
      and (to_entries | map(.value.address == $a and .value.inlineDatumRaw != null) | any)
    ' >/dev/null 2>&1; then
    touch "$SENTINEL"
    echo "Head already seeded (no fiction UTxO; found output at ${PYTH_OUTPUT_ADDR})."
    exit 0
  fi
  if echo "$body" | jq -e --arg k "$INITIAL_UTXO_REF" 'type == "object" and has($k)' >/dev/null 2>&1; then
    break
  fi
  n=$((n + 1))
  if [ "$n" -ge "$MAX_WAIT" ]; then
    echo "Timeout: initial UTxO not in snapshot. Ensure all Hydra peers are up and connected." >&2
    exit 1
  fi
  sleep 1
done

MSG=$(jq -c '{tag: "NewTx", transaction: .}' "$PYTH_SETUP_TX_ADDR")
WS_FULL="${WS_URL}?history=no"

echo "Submitting NewTx via ${WS_FULL} ..."
OUT=$( (sleep 0.3; echo "$MSG"; sleep 4) | websocat "$WS_FULL" 2>&1) || true

if echo "$OUT" | grep -q '"tag":"TxValid"'; then
  mkdir -p "$(dirname "$SENTINEL")"
  touch "$SENTINEL"
  echo "Seed tx accepted (TxValid)."
  exit 0
fi

if echo "$OUT" | grep -q '"tag":"TxInvalid"'; then
  body=$(api_root /snapshot/utxo)
  if echo "$body" | jq -e --arg k "$INITIAL_UTXO_REF" --arg a "$PYTH_OUTPUT_ADDR" '
      type == "object"
      and (has($k) | not)
      and (to_entries | map(.value.address == $a and .value.inlineDatumRaw != null) | any)
    ' >/dev/null 2>&1; then
    mkdir -p "$(dirname "$SENTINEL")"
    touch "$SENTINEL"
    echo "Seed already applied (TxInvalid on replay; snapshot shows seeded output)."
    exit 0
  fi
  echo "$OUT" | tail -n 3 >&2
  echo "Hydra rejected the seed transaction (TxInvalid)." >&2
  exit 1
fi

echo "$OUT" >&2
echo "Unexpected WebSocket response; not marking done." >&2
exit 1

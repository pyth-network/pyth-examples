#!/bin/bash

set -o errexit
set -o nounset
set -o pipefail
set -x

starkli --version 1>&2
scarb --version 1>&2

export STARKNET_ACCOUNT=katana-0
export STARKNET_RPC=http://0.0.0.0:5050

cd "$(dirname "$0")/.."
scarb build 1>&2

# predeployed fee token contract in katana
fee_token_address=0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7

if [ -z ${PYTH_CONTRACT_ADDRESS+x} ]; then
    >&2 echo "Missing PYTH_CONTRACT_ADDRESS env var"
    exit 1
fi

send_usd_hash=$(starkli declare --watch target/dev/send_usd_send_usd.contract_class.json)

# STRK/USD
price_feed_id=0x6a182399ff70ccf3e06024898942028204125a819e519a335ffa4579e66cd870

send_usd_address=$(starkli deploy --watch "${send_usd_hash}" \
    "${PYTH_CONTRACT_ADDRESS}" \
    "${fee_token_address}" \
)

>&2 echo send_usd contract has been successfully deployed at "${send_usd_address}"

echo "SEND_USD_CONTRACT_ADDRESS=${send_usd_address}"

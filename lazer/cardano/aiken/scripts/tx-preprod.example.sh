#!/usr/bin/env bash
#
# Example only — not runnable end-to-end without your keys, UTxOs, and collateral.
# Preprod: --testnet-magic 1
#
set -euo pipefail

: "${TESTNET_MAGIC:=1}"
: "${CARDANO_NODE_SOCKET_PATH:?Set CARDANO_NODE_SOCKET_PATH}"

CLI=(cardano-cli conway transaction)

# 1) Create (lock): build a tx that pays to the script address with inline IronPigDatum.
#    No redeemer — script does not execute.
#
# 2) Deposit: spend script UTxO with redeemer = Constructor 0 (Deposit) and pay back
#    to the same script hash with the same datum and >= previous value.
#
# 3) Withdraw: spend script UTxO with redeemer = Constructor 1 (Withdraw),
#    include a reference input carrying the Pyth batch (policy + inline PythOracleDatum),
#    add owner vkey to required signers, consume 100% of script value to non-script outputs.

echo "See README.md for datum/redeemer CBOR layout (plutus.json schema)."
echo "Use plutus.json + your off-chain stack (PyCardano, Lucid, cardano-cli json, etc.)."
echo "TESTNET_MAGIC=$TESTNET_MAGIC SOCKET=$CARDANO_NODE_SOCKET_PATH"

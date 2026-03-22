import "dotenv/config";

import { applyHedge, fetchFirstVaultUtxo } from "../lib/transactions.js";

async function main() {
  const strike = BigInt(process.env.HEDGE_STRIKE_RAW ?? "2500000");
  const payout = BigInt(process.env.HEDGE_PAYOUT_LOVELACE ?? "5000000");

  const vaultUtxo = await fetchFirstVaultUtxo();
  const txHash = await applyHedge({
    vaultUtxo,
    strikeRaw: strike,
    payoutLovelace: payout,
  });
  console.log("applyHedge tx:", txHash);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

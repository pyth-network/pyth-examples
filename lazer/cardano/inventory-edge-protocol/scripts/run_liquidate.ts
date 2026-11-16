import "dotenv/config";

import { PYTH_LAZER_FEEDS, type ShadowAssetKey } from "../lib/feeds.js";
import { fetchFirstVaultUtxo, liquidate } from "../lib/transactions.js";

async function main() {
  const asset = (process.env.SHADOW_ASSET ?? "XAU_USD") as ShadowAssetKey;
  if (!(asset in PYTH_LAZER_FEEDS)) {
    throw new Error(`Invalid SHADOW_ASSET ${asset}`);
  }

  const vaultUtxo = await fetchFirstVaultUtxo();
  const txHash = await liquidate({
    vaultUtxo,
    priceFeedId: PYTH_LAZER_FEEDS[asset],
  });
  console.log("liquidate tx:", txHash);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

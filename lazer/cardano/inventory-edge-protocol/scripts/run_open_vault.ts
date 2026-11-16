import "dotenv/config";

import { PYTH_LAZER_FEEDS, type ShadowAssetKey } from "../lib/feeds.js";
import { openVault } from "../lib/transactions.js";

async function main() {
  const policy = process.env.SHADOW_POLICY_ID;
  const nameHex = process.env.SHADOW_NAME_HEX;
  const asset = (process.env.SHADOW_ASSET ?? "XAU_USD") as ShadowAssetKey;
  if (!policy || !nameHex) {
    throw new Error(
      "Set SHADOW_POLICY_ID and SHADOW_NAME_HEX (printed by npm run mock-assets)",
    );
  }
  if (!(asset in PYTH_LAZER_FEEDS)) {
    throw new Error(`Invalid SHADOW_ASSET ${asset}`);
  }

  const debt = BigInt(process.env.VAULT_DEBT_LOVELACE ?? "1000000000");
  const qty = BigInt(process.env.VAULT_COLLATERAL_QTY ?? "1000000");

  const txHash = await openVault({
    nftPolicyHex: policy,
    nftNameHex: nameHex,
    feedId: PYTH_LAZER_FEEDS[asset],
    debtLovelace: debt,
    collateralQty: qty,
  });
  console.log("openVault tx:", txHash);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

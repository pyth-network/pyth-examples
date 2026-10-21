/**
 * Mint 3 native "shadow" NFTs (Lucid + Blockfrost or Maestro PreProd).
 * Metadata follows CIP-25 label 721 with Lazer-style feed id hints for judges.
 */
import "dotenv/config";

import { Blockfrost, Lucid, Maestro } from "lucid-cardano";

import {
  PYTH_LAZER_FEEDS,
  SHADOW_ASSETS,
  type ShadowAssetKey,
} from "../lib/feeds.js";

const ORDER: ShadowAssetKey[] = ["XAU_USD", "WTI_USD", "BTC_USD"];

async function main() {
  const projectId = process.env.BLOCKFROST_PROJECT_ID;
  const maestroKey = process.env.MAESTRO_API_KEY;
  const mnemonic = process.env.CARDANO_MNEMONIC;
  if (!mnemonic) throw new Error("Set CARDANO_MNEMONIC");

  const lucid =
    projectId
      ? await Lucid.new(
          new Blockfrost(
            "https://cardano-preprod.blockfrost.io/api/v0",
            projectId,
          ),
          "Preprod",
        )
      : maestroKey
        ? await Lucid.new(
            new Maestro({ network: "Preprod", apiKey: maestroKey }),
            "Preprod",
          )
        : (() => {
            throw new Error(
              "Set BLOCKFROST_PROJECT_ID or MAESTRO_API_KEY (Preprod)",
            );
          })();
  lucid.selectWalletFromSeed(mnemonic);

  const addr = await lucid.wallet.address();
  const details = lucid.utils.getAddressDetails(addr);
  if (details.paymentCredential?.type !== "Key") {
    throw new Error("Expected key payment credential");
  }

  const mintingPolicy = lucid.utils.nativeScriptFromJson({
    type: "all",
    scripts: [{ type: "sig", keyHash: details.paymentCredential.hash }],
  });
  const policyId = lucid.utils.mintingPolicyToId(mintingPolicy);

  const mintMap: Record<string, bigint> = {};
  const metaInner: Record<string, object> = {};

  for (const key of ORDER) {
    const assetName = `Shadow${key}`;
    const nameHex = Buffer.from(assetName, "utf8").toString("hex");
    const unit = policyId + nameHex;
    mintMap[unit] = 1n;
    const m = SHADOW_ASSETS[key];
    metaInner[assetName] = {
      name: m.label,
      description: m.description,
      pyth_lazer_feed_id: String(PYTH_LAZER_FEEDS[key]),
      inventory_edge_class: key,
    };
  }

  const tx = await lucid
    .newTx()
    .mintAssets(mintMap)
    .attachMintingPolicy(mintingPolicy)
    .attachMetadata(721, { [policyId]: metaInner })
    .complete();

  const signed = await tx.sign().complete();
  const txHash = await signed.submit();

  console.log("Submitted mint tx:", txHash);
  console.log("PolicyId:", policyId);
  console.log("\nPer-asset (use for openVault env):");
  for (const key of ORDER) {
    const assetName = `Shadow${key}`;
    const nameHex = Buffer.from(assetName, "utf8").toString("hex");
    console.log(
      `  ${key}: SHADOW_POLICY_ID=${policyId} SHADOW_NAME_HEX=${nameHex}  (feed ${PYTH_LAZER_FEEDS[key]})`,
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

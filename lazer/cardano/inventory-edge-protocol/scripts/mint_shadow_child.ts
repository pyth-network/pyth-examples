/**
 * Se ejecuta en un proceso aparte (`node --import tsx`) para aislar el WASM de Lucid
 * del servidor Express (evita "unreachable" / corrupción CML en el mismo proceso).
 */
import "../server/load_env.js";

import type { DemoSlot } from "../lib/feeds.js";
import { mintShadowNft } from "../lib/mint_shadow.js";

const slot = process.argv[2];
if (slot !== "metal" && slot !== "oil" && slot !== "stock") {
  console.error('slot must be "metal", "oil", or "stock"');
  process.exit(1);
}

mintShadowNft(slot as DemoSlot)
  .then((r) => {
    process.stdout.write(
      `${JSON.stringify({
        txHash: r.txHash,
        policyId: r.policyId,
        assetName: r.assetName,
        nameHex: r.nameHex,
        slot: r.slot,
        assetKey: r.assetKey,
        feedId: r.feedId,
      })}\n`,
    );
  })
  .catch((e) => {
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(1);
  });

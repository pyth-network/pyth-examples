/**
 * Mint one native shadow NFT (Lucid) — unique asset name so judges can repeat demos.
 */
import { randomBytes } from "node:crypto";

import { Blockfrost, Lucid, Maestro } from "lucid-cardano";

import {
  DEMO_SLOT_TO_KEY,
  type DemoSlot,
  PYTH_LAZER_FEEDS,
  SHADOW_ASSETS,
} from "./feeds.js";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

/**
 * CML WASM is not safe with overlapping use: another request must not call
 * `Lucid.new` / wallet / tx while this one is still using an instance.
 * Queue the whole create + callback (not only `Lucid.new`).
 */
let lucidOpQueue: Promise<unknown> = Promise.resolve();

async function createLucidPreprod(): Promise<Lucid> {
  const projectId = process.env.BLOCKFROST_PROJECT_ID;
  const maestroKey = process.env.MAESTRO_API_KEY;
  if (projectId) {
    return await Lucid.new(
      new Blockfrost("https://cardano-preprod.blockfrost.io/api/v0", projectId),
      "Preprod",
    );
  }
  if (maestroKey) {
    return await Lucid.new(
      new Maestro({ network: "Preprod", apiKey: maestroKey }),
      "Preprod",
    );
  }
  throw new Error("Set BLOCKFROST_PROJECT_ID or MAESTRO_API_KEY (Preprod)");
}

function rethrowIfLucidWasmPanic(e: unknown): never {
  const msg = e instanceof Error ? e.message : String(e);
  const low = msg.toLowerCase();
  if (
    low.includes("unreachable") ||
    low.includes("recursive use") ||
    low.includes("unsafe aliasing")
  ) {
    throw new Error(
      "Lucid/CML (WASM) falló en runtime. Suele deberse a Node 24+ inestable con lucid-cardano, " +
        "o a carga muy paralela. Probá Node 20 o 22 LTS (`nvm use 22`), reiniciá `npm run demo` y una sola pestaña. " +
        `Original: ${msg}`,
    );
  }
  throw e;
}

/** Run Lucid work (mint, UTxO scan, openVault, …) one request at a time. */
export async function withLucidPreprod<T>(
  fn: (lucid: Lucid) => Promise<T>,
): Promise<T> {
  const job = lucidOpQueue.then(async () => {
    const lucid = await createLucidPreprod();
    try {
      return await fn(lucid);
    } catch (e) {
      rethrowIfLucidWasmPanic(e);
    }
  });
  lucidOpQueue = job.then(
    () => undefined,
    () => undefined,
  );
  return job;
}

export type MintShadowResult = {
  txHash: string;
  policyId: string;
  assetName: string;
  nameHex: string;
  slot: DemoSlot;
  assetKey: keyof typeof PYTH_LAZER_FEEDS;
  feedId: number;
};

export async function mintShadowNft(slot: DemoSlot): Promise<MintShadowResult> {
  const mnemonic = requireEnv("CARDANO_MNEMONIC");
  return withLucidPreprod(async (lucid) => {
    lucid.selectWalletFromSeed(mnemonic);

    const addr = await lucid.wallet.address();
    const details = lucid.utils.getAddressDetails(addr);
    if (details.paymentCredential?.type !== "Key") {
      throw new Error("Expected key payment credential");
    }

    const key = DEMO_SLOT_TO_KEY[slot];
    const suffix = randomBytes(4).toString("hex");
    const assetName = `Shadow${key}_${suffix}`;
    const nameHex = Buffer.from(assetName, "utf8").toString("hex");

    const mintingPolicy = lucid.utils.nativeScriptFromJson({
      type: "all",
      scripts: [{ type: "sig", keyHash: details.paymentCredential.hash }],
    });
    const policyId = lucid.utils.mintingPolicyToId(mintingPolicy);
    const unit = policyId + nameHex;

    const meta = SHADOW_ASSETS[key];
    const tx = await lucid
      .newTx()
      .mintAssets({ [unit]: 1n })
      .attachMintingPolicy(mintingPolicy)
      .attachMetadata(721, {
        [policyId]: {
          [assetName]: {
            name: meta.label,
            description: meta.description,
            pyth_lazer_feed_id: String(PYTH_LAZER_FEEDS[key]),
            inventory_edge_class: key,
            inventory_edge_slot: slot,
          },
        },
      })
      .complete();

    const signed = await tx.sign().complete();
    const txHash = await signed.submit();

    return {
      txHash,
      policyId,
      assetName,
      nameHex,
      slot,
      assetKey: key,
      feedId: PYTH_LAZER_FEEDS[key],
    };
  });
}

import type { NextApiRequest, NextApiResponse } from "next";
import { BlockfrostProvider, MeshWallet } from "@meshsdk/core";

type SubmitResponse = { txHash: string } | { error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SubmitResponse>,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { partiallySignedTx } = req.body ?? {};
  if (!partiallySignedTx || typeof partiallySignedTx !== "string") {
    return res.status(400).json({ error: "partiallySignedTx is required" });
  }

  const blockfrostId = process.env.BLOCKFROST_ID;
  const mnemonic = process.env.MNEMONIC;

  if (!blockfrostId || !mnemonic) {
    return res.status(500).json({ error: "Missing server env (BLOCKFROST_ID or MNEMONIC)" });
  }

  try {
    const provider = new BlockfrostProvider(blockfrostId);
    const backendWallet = new MeshWallet({
      networkId: 0,
      fetcher: provider,
      submitter: provider,
      key: { type: "mnemonic", words: mnemonic.split(" ") },
    });

    const fullySigned = await backendWallet.signTx(partiallySignedTx, true);
    const txHash = await backendWallet.submitTx(fullySigned);

    return res.status(200).json({ txHash });
  } catch (err) {
    console.error("[deposit-b-submit] error:", err);
    const message = err instanceof Error ? err.message : "Submission failed";
    return res.status(500).json({ error: message });
  }
}

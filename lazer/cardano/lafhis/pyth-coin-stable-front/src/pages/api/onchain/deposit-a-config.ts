import type { NextApiRequest, NextApiResponse } from "next";
import { readFileSync } from "node:fs";
import path from "node:path";

type PlutusValidator = {
  title: string;
  compiledCode: string;
};

type PlutusJson = {
  validators: PlutusValidator[];
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const blockfrostId = process.env.BLOCKFROST_ID;
  const pythPolicyId = process.env.PYTH_POLICY_ID;
  const backendPkh = process.env.BACKEND_PKH;

  if (!blockfrostId || !pythPolicyId || !backendPkh) {
    return res.status(500).json({ error: "Missing server env for on-chain config" });
  }

  try {
    const plutusPath = path.resolve(process.cwd(), "../pyth-coin-stable-validators/plutus.json");
    const raw = readFileSync(plutusPath, "utf8");
    const plutus = JSON.parse(raw) as PlutusJson;

    if (!Array.isArray(plutus.validators)) {
      return res.status(500).json({ error: "Invalid plutus.json format" });
    }

    return res.status(200).json({
      blockfrostId,
      pythPolicyId,
      backendPkh,
      plutus: {
        validators: plutus.validators,
      },
    });
  } catch (error) {
    console.error("Failed to load plutus.json", error);
    return res.status(500).json({ error: "Could not read plutus.json" });
  }
}

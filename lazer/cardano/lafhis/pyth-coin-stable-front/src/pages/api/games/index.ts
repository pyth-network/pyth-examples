import type { NextApiRequest, NextApiResponse } from "next";
import { createSession, validateGameConfig } from "@/server/gameStore";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { config, creatorWallet } = req.body ?? {};
  const parsedConfig = validateGameConfig(config);

  if (!parsedConfig) {
    return res.status(400).json({ error: "Invalid game config" });
  }

  if (!creatorWallet || typeof creatorWallet !== "string") {
    return res.status(400).json({ error: "creatorWallet is required" });
  }

  const session = createSession(parsedConfig, creatorWallet);
  return res.status(201).json({ game: session });
}

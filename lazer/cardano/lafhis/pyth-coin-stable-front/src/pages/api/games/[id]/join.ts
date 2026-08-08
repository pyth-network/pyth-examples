import type { NextApiRequest, NextApiResponse } from "next";
import { joinSession, validateRate } from "@/server/gameStore";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const id = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  if (!id) {
    return res.status(400).json({ error: "Missing game id" });
  }

  const { wallet, selectedRate } = req.body ?? {};
  if (!wallet || typeof wallet !== "string") {
    return res.status(400).json({ error: "wallet is required" });
  }
  const parsedRate = validateRate(selectedRate);
  if (!parsedRate) {
    return res.status(400).json({ error: "selectedRate is required" });
  }

  const result = joinSession(id, wallet, parsedRate);
  if (result.error === "not_found") {
    return res.status(404).json({ error: "Game not found" });
  }
  if (result.error === "full") {
    return res.status(409).json({ error: "Game already has two players" });
  }
  if (result.error === "same_rate") {
    return res.status(409).json({ error: "You must choose a different asset than player one" });
  }

  return res.status(200).json({ game: result.session });
}

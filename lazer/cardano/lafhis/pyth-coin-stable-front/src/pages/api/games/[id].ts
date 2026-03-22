import type { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "@/server/gameStore";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const id = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  if (!id) {
    return res.status(400).json({ error: "Missing game id" });
  }

  const game = getSession(id);
  if (!game) {
    return res.status(404).json({ error: "Game not found" });
  }

  return res.status(200).json({ game });
}

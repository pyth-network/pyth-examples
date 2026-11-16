import type { NextApiRequest, NextApiResponse } from "next";
import { updateSessionOnchain } from "@/server/gameStore";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const id = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  if (!id) {
    return res.status(400).json({ error: "Missing game id" });
  }

  const updated = updateSessionOnchain(id, req.body ?? {});
  if (!updated) {
    return res.status(404).json({ error: "Game not found" });
  }

  return res.status(200).json({ game: updated });
}

export const dynamic = "force-dynamic";

import { isBlockfrostConfigured } from "@/lib/cardano";
import { isPythConfigured } from "@/lib/pyth";

export async function GET() {
  return Response.json({
    pyth: isPythConfigured(),
    blockfrost: isBlockfrostConfigured(),
  });
}

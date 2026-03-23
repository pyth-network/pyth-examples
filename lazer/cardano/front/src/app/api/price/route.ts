export const dynamic = "force-dynamic";

import { getFreshPrice, initPythClient } from "@/lib/pyth";

export async function GET() {
  try {
    await initPythClient();
    const price = await getFreshPrice();
    return Response.json({
      feedId: price.feedId,
      priceUsdCents: price.priceUsdCents,
      timestamp: price.timestamp,
    });
  } catch (err) {
    return Response.json(
      { error: (err as Error).message },
      { status: 503 },
    );
  }
}

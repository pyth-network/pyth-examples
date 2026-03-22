export const dynamic = "force-dynamic";

import { getWalletBalance, getNetwork, getScriptAddress, isBlockfrostConfigured } from "@/lib/cardano";

export async function POST(request: Request) {
  try {
    const { address } = (await request.json()) as { address?: string };

    if (!address) {
      return Response.json({ error: "address is required" }, { status: 400 });
    }

    if (!isBlockfrostConfigured()) {
      return Response.json({
        address,
        network: getNetwork(),
        scriptAddress: getScriptAddress(),
        configured: false,
      });
    }

    const balanceLovelace = await getWalletBalance(address);
    return Response.json({
      address,
      network: getNetwork(),
      scriptAddress: getScriptAddress(),
      balanceLovelace,
      configured: true,
    });
  } catch (err) {
    return Response.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}

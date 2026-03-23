export const dynamic = "force-dynamic";

import { fetchScriptUtxos, getScriptAddress } from "@/lib/cardano";

export async function GET() {
  try {
    const utxos = await fetchScriptUtxos();
    return Response.json({
      scriptAddress: getScriptAddress(),
      utxos,
    });
  } catch (err) {
    return Response.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}

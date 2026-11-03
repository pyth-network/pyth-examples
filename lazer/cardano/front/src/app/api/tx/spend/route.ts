export const dynamic = "force-dynamic";

import {
  spendOracleUtxo,
  getScriptAddress,
  getNetwork,
} from "@/lib/cardano";
import { getFreshPrice, initPythClient } from "@/lib/pyth";
import { decide } from "@/lib/price";
import type { OracleDatum } from "@/types";

interface SpendBody {
  datum: OracleDatum;
  mnemonic: string[];
  dryRun?: boolean;
  maxAgeSeconds?: number;
}

export async function POST(request: Request) {
  try {
    const body: SpendBody = await request.json();
    const { datum, mnemonic, dryRun, maxAgeSeconds = 60 } = body;

    if (!datum?.kind) {
      return Response.json({ error: "datum is required" }, { status: 400 });
    }

    await initPythClient();
    const price = await getFreshPrice();
    const priceUsdCents = Number(price.priceUsdCents);

    const decision = decide(priceUsdCents, price.timestamp, datum, maxAgeSeconds);
    if (decision.action !== "spend") {
      return Response.json(
        {
          error: `Off-chain guard rejected: ${decision.reason}`,
          decision,
        },
        { status: 422 },
      );
    }

    if (dryRun) {
      return Response.json({
        txHash: "(dry-run)",
        kind: "spend",
        status: "dry-run",
        scriptAddress: getScriptAddress(),
        datum,
        network: getNetwork(),
        decision,
      });
    }

    if (!mnemonic || mnemonic.length !== 24) {
      return Response.json(
        { error: "24-word mnemonic is required for non-dry-run" },
        { status: 400 },
      );
    }

    const txHash = await spendOracleUtxo(mnemonic, datum, price.payload);
    return Response.json({
      txHash,
      kind: "spend",
      status: "submitted",
      scriptAddress: getScriptAddress(),
      datum,
      network: getNetwork(),
      decision,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("[api/tx/spend]", message, stack);
    return Response.json(
      { error: message },
      { status: 500 },
    );
  }
}

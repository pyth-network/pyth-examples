export const dynamic = "force-dynamic";

import { lockOracleUtxo, getScriptAddress, getNetwork } from "@/lib/cardano";
import type { OracleDatum } from "@/types";

interface LockBody {
  datum: OracleDatum;
  mnemonic: string[];
  lovelace?: number;
  dryRun?: boolean;
}

export async function POST(request: Request) {
  try {
    const body: LockBody = await request.json();
    const { datum, mnemonic, lovelace, dryRun } = body;

    if (!datum?.kind) {
      return Response.json({ error: "datum is required" }, { status: 400 });
    }

    if (dryRun) {
      return Response.json({
        txHash: "(dry-run)",
        kind: "lock",
        status: "dry-run",
        scriptAddress: getScriptAddress(),
        datum,
        lovelace: String(lovelace ?? 2_000_000),
        network: getNetwork(),
      });
    }

    if (!mnemonic || mnemonic.length !== 24) {
      return Response.json(
        { error: "24-word mnemonic is required for non-dry-run" },
        { status: 400 },
      );
    }

    const txHash = await lockOracleUtxo(mnemonic, datum, lovelace);
    return Response.json({
      txHash,
      kind: "lock",
      status: "submitted",
      scriptAddress: getScriptAddress(),
      datum,
      lovelace: String(lovelace ?? 2_000_000),
      network: getNetwork(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("[api/tx/lock]", message, stack);
    return Response.json(
      { error: message },
      { status: 500 },
    );
  }
}

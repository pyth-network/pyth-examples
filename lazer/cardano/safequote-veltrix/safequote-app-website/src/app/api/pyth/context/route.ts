import { NextResponse } from "next/server";

export async function GET() {
  const stateTxHash = process.env.NEXT_PUBLIC_PYTH_STATE_TX_HASH;
  const stateOutputIndex = Number(
    process.env.NEXT_PUBLIC_PYTH_STATE_OUTPUT_INDEX ?? "-1",
  );
  const withdrawScriptHash = process.env.NEXT_PUBLIC_PYTH_WITHDRAW_SCRIPT_HASH;

  if (!stateTxHash || stateOutputIndex < 0 || !withdrawScriptHash) {
    return NextResponse.json(
      { message: "Missing Pyth context configuration" },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      item: {
        stateTxHash,
        stateOutputIndex,
        withdrawScriptHash,
      },
    },
    { status: 200 },
  );
}

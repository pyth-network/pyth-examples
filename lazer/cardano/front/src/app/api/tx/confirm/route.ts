import { NextResponse } from "next/server";

const BLOCKFROST_API_KEY = process.env.BLOCKFROST_API_KEY ?? "";
const NETWORK = process.env.CARDANO_NETWORK ?? "preprod";

export async function POST(request: Request) {
  const { txHash } = (await request.json()) as { txHash: string };
  if (!txHash) {
    return NextResponse.json({ error: "txHash required" }, { status: 400 });
  }

  const baseUrl =
    NETWORK === "mainnet"
      ? "https://cardano-mainnet.blockfrost.io/api/v0"
      : `https://cardano-${NETWORK}.blockfrost.io/api/v0`;

  const res = await fetch(`${baseUrl}/txs/${txHash}`, {
    headers: { project_id: BLOCKFROST_API_KEY },
  });

  if (res.status === 404) {
    return NextResponse.json({ confirmed: false });
  }
  if (!res.ok) {
    return NextResponse.json({ confirmed: false });
  }

  const data = await res.json();
  return NextResponse.json({
    confirmed: true,
    block: data.block,
    slot: data.slot,
  });
}

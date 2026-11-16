import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    walletName?: string;
    address?: string;
  };

  if (!body.walletName || !body.address) {
    return NextResponse.json(
      { message: "Wallet name and address are required" },
      { status: 400 },
    );
  }

  const user = {
    id: `wallet-${body.walletName.toLowerCase()}`,
    walletName: body.walletName,
    walletAddress: body.address,
  };

  const response = NextResponse.json({ user }, { status: 200 });
  response.cookies.set("safequote_session", body.address, {
    httpOnly: false,
    sameSite: "lax",
    secure: false,
    path: "/",
  });

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true }, { status: 200 });
  response.cookies.set("safequote_session", "", {
    httpOnly: false,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 0,
  });

  return response;
}

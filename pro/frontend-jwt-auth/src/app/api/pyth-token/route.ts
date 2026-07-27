import { NextResponse } from "next/server";

const DEFAULT_PYTH_API_BASE_URL = "https://pyth.dourolabs.app";

// Do not cache JWTs on the edge / Data Cache; each mint is a fresh call
// to the upstream token endpoint with the server-held `PRO_API_KEY`.
export const dynamic = "force-dynamic";

interface MintRequestBody {
  ttl_seconds?: number;
}

export async function POST(request: Request) {
  const apiKey = process.env.PRO_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "PRO_API_KEY is not set. Copy .env.example to .env.local and set PRO_API_KEY, then restart `pnpm dev`.",
      },
      { status: 500 },
    );
  }

  const baseUrl = process.env.PYTH_API_BASE_URL ?? DEFAULT_PYTH_API_BASE_URL;

  let body: MintRequestBody = {};
  try {
    const text = await request.text();
    if (text.length > 0) {
      body = JSON.parse(text) as MintRequestBody;
    }
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON or empty." },
      { status: 400 },
    );
  }

  const upstreamBody: MintRequestBody = {};
  if (typeof body.ttl_seconds === "number") {
    upstreamBody.ttl_seconds = body.ttl_seconds;
  }

  const upstream = await fetch(`${baseUrl}/auth/token`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(upstreamBody),
    cache: "no-store",
  });

  if (!upstream.ok) {
    // For an example, mirroring the upstream text keeps debugging simple.
    // In production, log the upstream response server-side and return a
    // generic error so mint failures don't leak internal details.
    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("content-type") ?? "text/plain",
      },
    });
  }

  const json = (await upstream.json()) as {
    access_token: string;
    expires_at: string;
    token_type: string;
  };

  return NextResponse.json(json, {
    headers: { "Cache-Control": "no-store" },
  });
}

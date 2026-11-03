import { NextResponse } from "next/server";
import type { SessionUser } from "@/types/auth";

function requireEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

const USERS = [
  {
    id: "seller-demo",
    role: "seller",
    email: requireEnv("DEMO_SELLER_EMAIL"),
    password: requireEnv("DEMO_SELLER_PASSWORD"),
    displayName: "Demo Seller",
  },
  {
    id: "user-demo",
    role: "user",
    email: requireEnv("DEMO_USER_EMAIL"),
    password: requireEnv("DEMO_USER_PASSWORD"),
    displayName: "Demo User",
  },
] as const;

export async function POST(request: Request) {
  const body = (await request.json()) as {
    email?: string;
    password?: string;
  };

  const user = USERS.find(
    (item) => item.email === body.email && item.password === body.password,
  );

  if (!user) {
    return NextResponse.json(
      { message: "Invalid credentials" },
      { status: 401 },
    );
  }

  const response = NextResponse.json(
    {
      accessToken: `demo-token-${user.id}`,
      user: {
        id: user.id,
        role: user.role,
        email: user.email,
        displayName: user.displayName,
      } satisfies SessionUser,
    },
    { status: 200 },
  );

  response.cookies.set("safequote_session", `demo-token-${user.id}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
  });

  return response;
}

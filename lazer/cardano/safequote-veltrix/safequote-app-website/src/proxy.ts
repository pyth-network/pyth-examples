import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PRIVATE_PREFIXES = ["/dashboard", "/invoices", "/create-invoice"];

export function proxy(request: NextRequest) {
  const session = request.cookies.get("safequote_session");
  const isPrivateRoute = PRIVATE_PREFIXES.some((prefix) =>
    request.nextUrl.pathname.startsWith(prefix),
  );

  if (isPrivateRoute && !session) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/invoices/:path*", "/create-invoice/:path*"],
};

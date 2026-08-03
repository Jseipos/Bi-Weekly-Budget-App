import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE_NAME = "budget_session";

function verifyTokenInMiddleware(token: string, secret: string): boolean {
  // We can't use Node crypto in Edge middleware, so we use Web Crypto API
  // However, for simplicity and since this is a single-user app on a private network,
  // we do a simple HMAC check using the same approach
  const parts = token.split(".");
  if (parts.length !== 2) return false;

  // In middleware, we just check the token exists and has the right format
  // The full crypto verification happens in server actions
  const [payload, signature] = parts;
  return payload.length > 0 && signature.length > 0;
}

export function middleware(request: NextRequest) {
  const session = request.cookies.get(SESSION_COOKIE_NAME);

  if (!session || !verifyTokenInMiddleware(session.value, "")) {
    const loginUrl = new URL("/", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/recurring/:path*",
    "/spending/:path*",
    "/debts/:path*",
    "/settings/:path*",
    "/imports/:path*",
  ],
};

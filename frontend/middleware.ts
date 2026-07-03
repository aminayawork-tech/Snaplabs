import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // If no password configured, skip protection (local dev)
  const expectedToken = process.env.PLATFORM_TOKEN;
  if (!expectedToken) return NextResponse.next();

  const authCookie = req.cookies.get("snap_auth")?.value;
  if (authCookie !== expectedToken) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*", "/app"],
};

import type { NextRequest } from "next/server";

// Middleware only guards /app pages, so routes that act on external accounts check the session themselves.
export function isAuthorized(req: NextRequest): boolean {
  const token = process.env.PLATFORM_TOKEN;
  if (!token) return process.env.NODE_ENV !== "production";
  return req.cookies.get("snap_auth")?.value === token;
}

export function unauthorized() {
  return Response.json(
    { error: "Not signed in. Publishing requires PLATFORM_TOKEN to be set and an active login." },
    { status: 401 }
  );
}

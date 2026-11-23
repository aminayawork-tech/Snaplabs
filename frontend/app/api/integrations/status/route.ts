import { NextRequest } from "next/server";
import { isAuthorized, unauthorized } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) return unauthorized();
  return Response.json({
    github: {
      connected: Boolean(process.env.GITHUB_TOKEN && process.env.GITHUB_REPO),
      repo: process.env.GITHUB_REPO ?? null,
      dir: process.env.GITHUB_BLOG_DIR ?? "content/blog",
    },
    mailchimp: {
      connected: Boolean(process.env.MAILCHIMP_API_KEY && process.env.MAILCHIMP_AUDIENCE_ID),
    },
  });
}

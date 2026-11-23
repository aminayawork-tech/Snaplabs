import { NextRequest } from "next/server";
import { isAuthorized, unauthorized } from "@/lib/auth";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

class GitHubError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) return unauthorized();

  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  if (!token || !repo) {
    return Response.json({ error: "GitHub is not connected. Set GITHUB_TOKEN and GITHUB_REPO in Vercel." }, { status: 400 });
  }
  const dir = (process.env.GITHUB_BLOG_DIR ?? "content/blog").replace(/^\/+|\/+$/g, "");
  const ext = (process.env.GITHUB_BLOG_EXT ?? "md").replace(/^\./, "");

  const { title, slug: rawSlug, description, body, mode } = await req.json();
  if (!title || !body) return Response.json({ error: "Title and body are required" }, { status: 400 });
  const slug = slugify(rawSlug || title);
  if (!slug) return Response.json({ error: "Invalid slug" }, { status: 400 });

  const gh = async (path: string, init?: RequestInit) => {
    const res = await fetch(`https://api.github.com/repos/${repo}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "snappymarketer",
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
      },
      cache: "no-store",
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  };
  const must = async (path: string, init?: RequestInit) => {
    const r = await gh(path, init);
    if (!r.ok) throw new GitHubError(`GitHub ${r.status}: ${r.data?.message ?? "request failed"}`, r.status);
    return r.data;
  };

  try {
    const base = process.env.GITHUB_BRANCH || (await must("")).default_branch;
    const filePath = `${dir}/${slug}.${ext}`;

    const existing = await gh(`/contents/${filePath}?ref=${encodeURIComponent(base)}`);
    if (existing.ok) {
      return Response.json({ error: `${filePath} already exists — change the slug.` }, { status: 409 });
    }

    const date = new Date().toISOString().slice(0, 10);
    const frontmatter = [
      "---",
      `title: ${JSON.stringify(String(title))}`,
      `description: ${JSON.stringify(String(description ?? ""))}`,
      `date: "${date}"`,
      "---",
      "",
    ].join("\n");
    const content = Buffer.from(`${frontmatter}${String(body).trim()}\n`, "utf8").toString("base64");

    if (mode === "direct") {
      const put = await must(`/contents/${filePath}`, {
        method: "PUT",
        body: JSON.stringify({ message: `Add blog post: ${title}`, content, branch: base }),
      });
      return Response.json({ url: put.content?.html_url ?? put.commit?.html_url, mode: "direct", path: filePath });
    }

    const ref = await must(`/git/ref/heads/${base}`);
    const branch = `blog/${slug}-${Date.now().toString(36)}`;
    await must("/git/refs", {
      method: "POST",
      body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: ref.object.sha }),
    });
    await must(`/contents/${filePath}`, {
      method: "PUT",
      body: JSON.stringify({ message: `Add blog post: ${title}`, content, branch }),
    });
    const pr = await must("/pulls", {
      method: "POST",
      body: JSON.stringify({
        title: `Blog: ${title}`,
        head: branch,
        base,
        body: `New blog post drafted in Snappymarketer.\n\n**File:** \`${filePath}\`\n**Description:** ${description ?? ""}\n\nVercel will build a preview for this PR — merge it to publish.`,
      }),
    });
    return Response.json({ url: pr.html_url, mode: "pr", path: filePath });
  } catch (e) {
    const status = e instanceof GitHubError ? e.status : 500;
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: status >= 400 && status < 600 ? status : 500 });
  }
}

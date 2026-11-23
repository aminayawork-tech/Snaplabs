import { NextRequest } from "next/server";
import { isAuthorized, unauthorized } from "@/lib/auth";
import { markdownToHtml } from "@/lib/markdownToHtml";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) return unauthorized();

  const key = process.env.MAILCHIMP_API_KEY;
  const listId = process.env.MAILCHIMP_AUDIENCE_ID;
  const dc = key?.split("-")[1];
  if (!key || !listId || !dc) {
    return Response.json({ error: "Mailchimp is not connected. Set MAILCHIMP_API_KEY and MAILCHIMP_AUDIENCE_ID in Vercel." }, { status: 400 });
  }

  const { subject, preview_text, body, title } = await req.json();
  if (!subject || !body) return Response.json({ error: "Subject and body are required" }, { status: 400 });

  const mc = async (path: string, init?: RequestInit) => {
    const res = await fetch(`https://${dc}.api.mailchimp.com/3.0${path}`, {
      ...init,
      headers: {
        Authorization: `Basic ${Buffer.from(`snappy:${key}`).toString("base64")}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`Mailchimp ${res.status}: ${data.detail ?? data.title ?? "request failed"}`);
    return data;
  };

  try {
    const list = await mc(`/lists/${listId}?fields=campaign_defaults`);
    const fromName = process.env.MAILCHIMP_FROM_NAME || list.campaign_defaults?.from_name;
    const replyTo = process.env.MAILCHIMP_REPLY_TO || list.campaign_defaults?.from_email;
    if (!fromName || !replyTo) {
      return Response.json({ error: "Set a default From name and email on your Mailchimp audience, or MAILCHIMP_FROM_NAME / MAILCHIMP_REPLY_TO." }, { status: 400 });
    }

    const campaign = await mc("/campaigns", {
      method: "POST",
      body: JSON.stringify({
        type: "regular",
        recipients: { list_id: listId },
        settings: {
          subject_line: String(subject).slice(0, 150),
          preview_text: String(preview_text ?? "").slice(0, 150),
          title: String(title || subject).slice(0, 100),
          from_name: fromName,
          reply_to: replyTo,
        },
      }),
    });
    await mc(`/campaigns/${campaign.id}/content`, {
      method: "PUT",
      body: JSON.stringify({ html: markdownToHtml(String(body)) }),
    });

    return Response.json({ url: `https://${dc}.admin.mailchimp.com/campaigns/edit?id=${campaign.web_id}` });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}

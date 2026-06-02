import { NextRequest } from "next/server";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { competitor_name, country = "US" } = await req.json();
  if (!competitor_name) return Response.json({ error: "competitor_name required" }, { status: 400 });

  const token = process.env.META_ACCESS_TOKEN;
  if (!token) return Response.json({ error: "META_ACCESS_TOKEN not configured" }, { status: 500 });

  const params = new URLSearchParams({
    access_token: token,
    search_terms: competitor_name,
    ad_type: "ALL",
    ad_reached_countries: JSON.stringify([country]),
    fields: [
      "id",
      "page_name",
      "ad_creative_bodies",
      "ad_creative_link_captions",
      "ad_creative_link_descriptions",
      "ad_creative_link_titles",
      "ad_snapshot_url",
      "ad_delivery_start_time",
      "ad_delivery_stop_time",
      "estimated_audience_size",
      "impressions",
      "spend",
      "currency",
      "publisher_platforms",
    ].join(","),
    limit: "20",
  });

  const url = `https://graph.facebook.com/v19.0/ads_archive?${params}`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (data.error) {
      return Response.json({ error: data.error.message, code: data.error.code }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ads = (data.data ?? []).map((ad: any) => ({
      id: ad.id,
      page_name: ad.page_name,
      body: (ad.ad_creative_bodies ?? [])[0] ?? "",
      title: (ad.ad_creative_link_titles ?? [])[0] ?? "",
      description: (ad.ad_creative_link_descriptions ?? [])[0] ?? "",
      caption: (ad.ad_creative_link_captions ?? [])[0] ?? "",
      snapshot_url: ad.ad_snapshot_url ?? "",
      start_date: ad.ad_delivery_start_time ?? "",
      end_date: ad.ad_delivery_stop_time ?? null,
      platforms: ad.publisher_platforms ?? [],
      impressions: ad.impressions ?? null,
      spend: ad.spend ?? null,
      currency: ad.currency ?? "USD",
      audience_size: ad.estimated_audience_size ?? null,
    }));

    return Response.json({ ads, total: ads.length, competitor: competitor_name });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}

import { NextRequest } from "next/server";

export const runtime = "nodejs";

interface TrendingTopic {
  title: string;
  traffic: string;
  picture: string;
  newsTitle: string;
  newsUrl: string;
  newsSource: string;
}

function extract(block: string, tag: string): string {
  const cdataMatch = block.match(new RegExp(`<${tag}><\\!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`));
  if (cdataMatch) return cdataMatch[1].trim();
  const plainMatch = block.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
  return plainMatch ? plainMatch[1].trim() : "";
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const geo = (searchParams.get("geo") ?? "US").toUpperCase().slice(0, 2);

  try {
    const res = await fetch(`https://trends.google.com/trending/rss?geo=${geo}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/rss+xml, application/xml, text/xml",
      },
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      return Response.json({ topics: [], geo, error: `HTTP ${res.status}` });
    }

    const xml = await res.text();
    const topics: TrendingTopic[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match: RegExpExecArray | null;

    while ((match = itemRegex.exec(xml)) !== null) {
      const block = match[1];
      const title = extract(block, "title");
      const traffic = extract(block, "ht:approxTraffic");
      const picture = extract(block, "ht:picture");

      // Extract first news item
      const newsBlock = block.match(/<ht:news_item>([\s\S]*?)<\/ht:news_item>/)?.[1] ?? "";
      const newsTitle = extract(newsBlock, "ht:news_item_title");
      const newsUrl = extract(newsBlock, "ht:news_item_url");
      const newsSource = extract(newsBlock, "ht:news_item_source");

      if (title) topics.push({ title, traffic, picture, newsTitle, newsUrl, newsSource });
    }

    return Response.json({ topics: topics.slice(0, 25), geo });
  } catch (err) {
    return Response.json({ topics: [], geo, error: String(err) });
  }
}

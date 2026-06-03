import { NextRequest } from "next/server";

export const maxDuration = 15;
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { keyword } = await req.json();
  if (!keyword) return Response.json({ error: "keyword required" }, { status: 400 });

  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return Response.json({ videos: [], no_key: true });

  const params = new URLSearchParams({
    part: "snippet",
    q: keyword,
    type: "video",
    maxResults: "6",
    order: "viewCount",
    relevanceLanguage: "en",
    key,
  });

  try {
    const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await res.json();
    if (data.error) return Response.json({ error: data.error.message, videos: [] }, { status: 400 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const videos = (data.items ?? []).map((item: any) => ({
      id: item.id.videoId as string,
      title: item.snippet.title as string,
      channel: item.snippet.channelTitle as string,
      thumbnail: (item.snippet.thumbnails?.medium?.url ?? item.snippet.thumbnails?.default?.url ?? "") as string,
      published: item.snippet.publishedAt as string,
      url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
    }));

    return Response.json({ videos });
  } catch (e) {
    return Response.json({ error: String(e), videos: [] }, { status: 500 });
  }
}

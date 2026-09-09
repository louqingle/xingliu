import type { MetadataRoute } from "next";

type SitemapVideo = {
  id: string;
  created_at: string;
};

async function getPublishedVideos(): Promise<SitemapVideo[]> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!base || !key) return [];
  try {
    const url = new URL(`${base}/rest/v1/videos`);
    url.searchParams.set("select", "id,created_at");
    url.searchParams.set("status", "eq.published");
    url.searchParams.set("order", "created_at.desc");
    url.searchParams.set("limit", "5000");
    const response = await fetch(url, { headers: { apikey: key, Authorization: `Bearer ${key}` }, next: { revalidate: 300 } });
    if (!response.ok) return [];
    return (await response.json()) as SitemapVideo[];
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://xingliu.vercel.app";
  const now = new Date();
  const videos = await getPublishedVideos();
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, lastModified: now, changeFrequency: "hourly", priority: 1 },
    { url: `${base}/discover`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/creator`, lastModified: now, changeFrequency: "weekly", priority: 0.5 },
    { url: `${base}/auth`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
  ];
  const videoRoutes: MetadataRoute.Sitemap = videos.filter(v => v.id).map(v => ({
    url: `${base}/video/${v.id}`,
    lastModified: v.created_at ? new Date(v.created_at) : now,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));
  return [...staticRoutes, ...videoRoutes];
}

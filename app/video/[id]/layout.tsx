import type { Metadata } from "next";

type VideoMeta = {
  title: string | null;
  music: string | null;
  user_id: string;
  cover_url: string | null;
};

type ProfileMeta = {
  username: string | null;
  nickname: string | null;
};

async function getVideo(id: string): Promise<{ video: VideoMeta | null; profile: ProfileMeta | null }> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!base || !key) return { video: null, profile: null };

  try {
    const videoUrl = new URL(`${base}/rest/v1/videos`);
    videoUrl.searchParams.set("select", "title,music,user_id,cover_url");
    videoUrl.searchParams.set("id", `eq.${id}`);
    videoUrl.searchParams.set("status", "eq.published");
    videoUrl.searchParams.set("limit", "1");

    const headers = { apikey: key, Authorization: `Bearer ${key}` };
    const videoRes = await fetch(videoUrl, { headers, next: { revalidate: 60 } });
    if (!videoRes.ok) return { video: null, profile: null };

    const videos = (await videoRes.json()) as VideoMeta[];
    const video = videos[0] ?? null;
    if (!video) return { video: null, profile: null };

    const profileUrl = new URL(`${base}/rest/v1/profiles`);
    profileUrl.searchParams.set("select", "username,nickname");
    profileUrl.searchParams.set("id", `eq.${video.user_id}`);
    profileUrl.searchParams.set("limit", "1");

    const profileRes = await fetch(profileUrl, { headers, next: { revalidate: 60 } });
    const profiles = profileRes.ok ? ((await profileRes.json()) as ProfileMeta[]) : [];

    return { video, profile: profiles[0] ?? null };
  } catch {
    return { video: null, profile: null };
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const { video, profile } = await getVideo(id);
  const title = video?.title?.trim() || "星流视频";
  const author = profile?.username || profile?.nickname || "星流创作者";
  const description = video?.music?.trim()
    ? `@${author} 发布的星流视频 · ${video.music.trim()}`
    : `@${author} 发布的星流视频，发现更多有趣内容。`;

  return {
    title,
    description,
    alternates: {
      canonical: `/video/${id}`,
    },
    openGraph: {
      type: "website",
      title,
      description,
      url: `/video/${id}`,
      siteName: "星流",
      locale: "zh_CN",
      ...(video?.cover_url
        ? { images: [{ url: video.cover_url, width: 720, height: 1280, alt: title }] }
        : {}),
    },
    twitter: {
      card: video?.cover_url ? "summary_large_image" : "summary",
      title,
      description,
      ...(video?.cover_url ? { images: [video.cover_url] } : {}),
    },
  };
}

export default function VideoLayout({ children }: { children: React.ReactNode }) {
  return children;
}

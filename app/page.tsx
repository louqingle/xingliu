"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Heart, MessageCircle, Share2, Search, Volume2, VolumeX, Home as HomeIcon, Users, Plus, Inbox, UserRound, Bookmark, X, Play } from "lucide-react";
import { supabase } from "../lib/supabase";

type VideoItem = {
  id: string;
  src: string;
  username: string;
  title: string;
  music: string;
  likes: number;
  comments: number;
  views: number;
  avatar: string;
  tag: string;
  userId?: string;
  createdAt?: string;
};

type CommentItem = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
};

const demoVideos: VideoItem[] = [
  { id: "demo-1", src: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4", username: "星流用户", title: "欢迎来到星流，记录生活里值得被看见的瞬间。✨", music: "原创音乐 · 星流", likes: 1280, comments: 86, views: 22000, avatar: "星", tag: "生活" },
  { id: "demo-2", src: "https://www.w3schools.com/html/mov_bbb.mp4", username: "小星", title: "今天的快乐很简单：出去走走，看看世界。", music: "星流音乐", likes: 2356, comments: 132, views: 41000, avatar: "小", tag: "日常" },
  { id: "demo-3", src: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4", username: "阿乐", title: "把普通的一天拍下来，也许它就是最好的故事。", music: "热门BGM · 星流", likes: 8942, comments: 421, views: 98000, avatar: "乐", tag: "记录" },
  { id: "demo-4", src: "https://www.w3schools.com/html/mov_bbb.mp4", username: "旅行者", title: "下一站，去一个没有去过的地方。🌍", music: "旅行歌单", likes: 15420, comments: 806, views: 180000, avatar: "旅", tag: "旅行" },
];

function fmt(n: number) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

export default function Home() {
  const router = useRouter();
  const feedRef = useRef<HTMLDivElement | null>(null);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const watchTimers = useRef<Record<string, number>>({});
  const lastTick = useRef(Date.now());
  const [videos, setVideos] = useState<VideoItem[]>(demoVideos);
  const [current, setCurrent] = useState(0);
  const [liked, setLiked] = useState<string[]>([]);
  const [saved, setSaved] = useState<string[]>([]);
  const [followed, setFollowed] = useState<string[]>([]);
  const [muted, setMuted] = useState(true);
  const [paused, setPaused] = useState(false);
  const [tab, setTab] = useState<"推荐" | "关注">("推荐");
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [commentOpen, setCommentOpen] = useState(false);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [comment, setComment] = useState("");
  const [toast, setToast] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadFeed = useCallback(async (uid: string | null) => {
    if (!supabase) return;
    const { data } = await supabase
      .from("videos")
      .select("id,video_url,caption,music,likes_count,comments_count,views_count,user_id,created_at,profiles(username,display_name,avatar_url)")
      .order("created_at", { ascending: false })
      .limit(60);

    if (!data?.length) {
      setVideos(demoVideos);
      return;
    }

    const mapped: VideoItem[] = data.map((v: any) => {
      const p = Array.isArray(v.profiles) ? v.profiles[0] : v.profiles;
      const name = p?.username || p?.display_name || "星流用户";
      return {
        id: v.id,
        src: v.video_url,
        username: name,
        title: v.caption || "",
        music: v.music || "原创音乐 · 星流",
        likes: v.likes_count || 0,
        comments: v.comments_count || 0,
        views: v.views_count || 0,
        avatar: (p?.display_name || p?.username || "星").slice(0, 1),
        tag: "星流",
        userId: v.user_id,
        createdAt: v.created_at,
      };
    });

    if (!uid) {
      setVideos(mapped);
      return;
    }

    const { data: events } = await supabase
      .from("video_events")
      .select("video_id,event_type,watch_ms,created_at")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(500);

    const eventList = events || [];
    const score = (v: VideoItem) => {
      const ev = eventList.filter((e: any) => e.video_id === v.id);
      const watch = ev.filter((e: any) => e.event_type === "watch").reduce((s: number, e: any) => s + (e.watch_ms || 0), 0) / 1000;
      const positive = ev.some((e: any) => e.event_type === "like") ? 18 : 0;
      const comments = ev.some((e: any) => e.event_type === "comment") ? 14 : 0;
      const shares = ev.some((e: any) => e.event_type === "share") ? 12 : 0;
      const saves = ev.some((e: any) => e.event_type === "save") ? 10 : 0;
      const skips = ev.filter((e: any) => e.event_type === "skip").length * 10;
      const seen = ev.filter((e: any) => e.event_type === "impression").length;
      const recency = v.createdAt ? Math.max(0, 7 - (Date.now() - new Date(v.createdAt).getTime()) / 86400000) : 0;
      const popularity = Math.log10(1 + v.likes * 2 + v.comments * 4 + v.views * 0.05);
      const followBonus = v.userId && followed.includes(v.userId) ? 16 : 0;
      return popularity + recency + Math.min(watch / 8, 20) + positive + comments + shares + saves - skips - seen * 1.5 + followBonus;
    };

    setVideos([...mapped].sort((a, b) => score(b) - score(a)));
  }, [followed]);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!supabase) {
        setLoading(false);
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (!alive) return;
      const uid = session?.user.id ?? null;
      setUserId(uid);
      await loadFeed(uid);
      if (alive) setLoading(false);
    })();
    return () => { alive = false; };
  }, [loadFeed]);

  useEffect(() => {
    if (!supabase) return;
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const uid = session?.user.id ?? null;
      setUserId(uid);
      if (!uid) {
        setLiked([]);
        setFollowed([]);
      }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!supabase || !userId) return;
    (async () => {
      const [{ data: likes }, { data: follows }] = await Promise.all([
        supabase.from("likes").select("video_id").eq("user_id", userId),
        supabase.from("follows").select("following_id").eq("follower_id", userId),
      ]);
      setLiked((likes || []).map((x: any) => x.video_id));
      setFollowed((follows || []).map((x: any) => x.following_id));
    })();
  }, [userId]);

  const feedVideos = useMemo(() => {
    if (tab === "关注") return videos.filter(v => v.userId && followed.includes(v.userId));
    return videos;
  }, [tab, videos, followed]);

  useEffect(() => {
    setCurrent(0);
    setPaused(false);
    feedRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [tab]);

  useEffect(() => {
    const feed = feedRef.current;
    if (!feed) return;
    const onScroll = () => {
      const next = Math.max(0, Math.min(feedVideos.length - 1, Math.round(feed.scrollTop / Math.max(window.innerHeight, 1))));
      setCurrent(prev => prev === next ? prev : next);
    };
    feed.addEventListener("scroll", onScroll, { passive: true });
    return () => feed.removeEventListener("scroll", onScroll);
  }, [feedVideos.length]);

  const active = feedVideos[current] || feedVideos[0];

  useEffect(() => {
    Object.entries(videoRefs.current).forEach(([id, video]) => {
      if (!video) return;
      video.muted = muted;
      const shouldPlay = active?.id === id && !paused;
      if (shouldPlay) video.play().catch(() => undefined);
      else video.pause();
    });

    lastTick.current = Date.now();
    if (active && !active.id.startsWith("demo-") && userId && supabase) {
      supabase.from("video_events").insert({ user_id: userId, video_id: active.id, event_type: "impression" }).then(() => undefined);
    }
  }, [active?.id, muted, paused, userId]);

  useEffect(() => {
    if (!active || active.id.startsWith("demo-") || !userId || !supabase) return;
    const timer = window.setInterval(() => {
      if (paused) return;
      const delta = Math.max(0, Date.now() - lastTick.current);
      lastTick.current = Date.now();
      watchTimers.current[active.id] = (watchTimers.current[active.id] || 0) + delta;
      if (watchTimers.current[active.id] >= 3000) {
        const ms = watchTimers.current[active.id];
        watchTimers.current[active.id] = 0;
        supabase.from("video_events").insert({ user_id: userId, video_id: active.id, event_type: "watch", watch_ms: ms }).then(() => undefined);
      }
    }, 3000);
    return () => window.clearInterval(timer);
  }, [active?.id, userId, paused]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 1800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!commentOpen || !active || active.id.startsWith("demo-") || !supabase) return;
    supabase
      .from("comments")
      .select("id,content,created_at,user_id,profiles(username,avatar_url)")
      .eq("video_id", active.id)
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data }) => {
        setComments((data || []).map((x: any) => {
          const p = Array.isArray(x.profiles) ? x.profiles[0] : x.profiles;
          return { id: x.id, content: x.content, created_at: x.created_at, user_id: x.user_id, username: p?.username || "星流用户", avatar_url: p?.avatar_url || null };
        }));
      });
  }, [commentOpen, active?.id]);

  async function track(eventType: string, videoId = active?.id, watchMs = 0) {
    if (!supabase || !userId || !videoId || videoId.startsWith("demo-")) return;
    await supabase.from("video_events").insert({ user_id: userId, video_id: videoId, event_type: eventType, watch_ms: watchMs });
  }

  function toastMsg(message: string) {
    setToast(message);
  }

  function requireLogin() {
    toastMsg("登录后即可使用这个功能");
    window.setTimeout(() => router.push("/auth"), 500);
  }

  async function toggleLike(v: VideoItem) {
    if (!userId || !supabase) return requireLogin();
    const has = liked.includes(v.id);
    setLiked(prev => has ? prev.filter(id => id !== v.id) : [...prev, v.id]);
    setVideos(prev => prev.map(item => item.id === v.id ? { ...item, likes: Math.max(0, item.likes + (has ? -1 : 1)) } : item));
    await track(has ? "unlike" : "like", v.id);
    if (has) await supabase.from("likes").delete().eq("video_id", v.id).eq("user_id", userId);
    else await supabase.from("likes").insert({ video_id: v.id, user_id: userId });
  }

  async function toggleSave(v: VideoItem) {
    if (!userId) return requireLogin();
    const has = saved.includes(v.id);
    setSaved(prev => has ? prev.filter(id => id !== v.id) : [...prev, v.id]);
    await track(has ? "unsave" : "save", v.id);
    toastMsg(has ? "已取消收藏" : "已收藏");
  }

  async function toggleFollow(v: VideoItem) {
    if (!userId || !supabase) return requireLogin();
    if (!v.userId || v.userId === userId) return toastMsg("不能关注自己");
    const has = followed.includes(v.userId);
    setFollowed(prev => has ? prev.filter(id => id !== v.userId) : [...prev, v.userId!]);
    await track(has ? "unfollow" : "follow", v.id);
    if (has) await supabase.from("follows").delete().eq("follower_id", userId).eq("following_id", v.userId);
    else await supabase.from("follows").insert({ follower_id: userId, following_id: v.userId });
  }

  async function share() {
    await track("share");
    if (navigator.share) {
      await navigator.share({ title: active?.title || "星流视频", url: window.location.href }).catch(() => undefined);
    } else {
      await navigator.clipboard?.writeText(window.location.href);
      toastMsg("链接已复制");
    }
  }

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    const text = comment.trim();
    if (!text) return;
    if (!userId || !supabase) return requireLogin();
    if (!active || active.id.startsWith("demo-")) return toastMsg("示例视频暂不支持评论");
    const { data, error } = await supabase.from("comments").insert({ video_id: active.id, user_id: userId, content: text }).select("id,content,created_at,user_id,profiles(username,avatar_url)").single();
    if (error || !data) return toastMsg("评论失败，请稍后重试");
    const p = Array.isArray((data as any).profiles) ? (data as any).profiles[0] : (data as any).profiles;
    setComments(prev => [{ id: (data as any).id, content: text, created_at: (data as any).created_at, user_id: userId, username: p?.username || "我", avatar_url: p?.avatar_url || null }, ...prev]);
    setVideos(prev => prev.map(v => v.id === active.id ? { ...v, comments: v.comments + 1 } : v));
    setComment("");
    await track("comment");
  }

  function openComments(v: VideoItem) {
    if (!userId) return requireLogin();
    setCommentOpen(true);
    track("comment", v.id);
  }

  function jumpToVideo(index: number) {
    setSearchOpen(false);
    setTab("推荐");
    window.requestAnimationFrame(() => {
      feedRef.current?.scrollTo({ top: index * window.innerHeight, behavior: "smooth" });
    });
  }

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return feedVideos.slice(0, 8);
    return feedVideos.filter(v => `${v.username} ${v.title} ${v.music} ${v.tag}`.toLowerCase().includes(q)).slice(0, 12);
  }, [query, feedVideos]);

  if (loading) {
    return <main className="app"><div className="loading">正在进入星流…</div></main>;
  }

  return (
    <main className="app">
      <div className="feed" ref={feedRef}>
        {feedVideos.length === 0 ? (
          <section className="page" style={{ display: "grid", placeItems: "center", padding: 32 }}>
            <div style={{ textAlign: "center" }}>
              <Users size={46} />
              <h2 style={{ margin: "18px 0 8px" }}>关注的人还没有作品</h2>
              <p style={{ opacity: .7 }}>先去推荐页发现几个喜欢的创作者吧</p>
              <button className="follow" onClick={() => setTab("推荐")}>去推荐</button>
            </div>
          </section>
        ) : feedVideos.map((v, i) => {
          const isLiked = liked.includes(v.id);
          const isSaved = saved.includes(v.id);
          const isFollowed = !!v.userId && followed.includes(v.userId);
          return (
            <section className="page" key={v.id}>
              <video
                ref={el => { videoRefs.current[v.id] = el; }}
                className="video"
                src={v.src}
                muted={muted}
                loop
                playsInline
                preload={i <= current + 1 ? "auto" : "metadata"}
                onClick={() => setPaused(prev => !prev)}
                onDoubleClick={() => toggleLike(v)}
              />
              <div className="shade top" />
              <div className="shade bottom" />
              {paused && i === current && <button className="pause" onClick={() => setPaused(false)}><Play size={34} fill="white" /></button>}

              <div className="topbar">
                <div className="tabs">
                  <button className={tab === "关注" ? "tab active" : "tab"} onClick={() => setTab("关注")}>关注</button>
                  <button className={tab === "推荐" ? "tab active" : "tab"} onClick={() => setTab("推荐")}>推荐</button>
                </div>
                <button className="iconBtn" aria-label="搜索" onClick={() => setSearchOpen(true)}><Search size={25} /></button>
              </div>

              <button className="sound" aria-label="声音" onClick={() => setMuted(prev => !prev)}>{muted ? <VolumeX size={20} /> : <Volume2 size={20} />}</button>

              <aside className="actions">
                <button className="action" onClick={() => toggleLike(v)}><span className={isLiked ? "circle like on" : "circle like"}><Heart size={30} fill={isLiked ? "currentColor" : "none"} /></span><b>{fmt(v.likes)}</b></button>
                <button className="action" onClick={() => openComments(v)}><span className="circle"><MessageCircle size={29} /></span><b>{fmt(v.comments)}</b></button>
                <button className="action" onClick={() => toggleSave(v)}><span className={isSaved ? "circle saved" : "circle"}><Bookmark size={28} fill={isSaved ? "currentColor" : "none"} /></span><b>{isSaved ? "已收藏" : "收藏"}</b></button>
                <button className="action" onClick={share}><span className="circle"><Share2 size={28} /></span><b>分享</b></button>
                <div className="disc">♪</div>
              </aside>

              <div className="info">
                <div className="author">
                  {v.userId ? <Link className="avatar" href={`/u/${v.userId}`}>{v.avatar}</Link> : <button className="avatar" onClick={() => toastMsg("演示用户没有个人主页")}>{v.avatar}</button>}
                  {v.userId ? <Link className="authorName" href={`/u/${v.userId}`}>@{v.username}</Link> : <button className="authorName" onClick={() => toastMsg("演示用户没有个人主页")}>@{v.username}</button>}
                  {v.userId && v.userId !== userId && <button className={isFollowed ? "follow followed" : "follow"} onClick={() => toggleFollow(v)}>{isFollowed ? "已关注" : "+ 关注"}</button>}
                </div>
                <div className="title">{v.title}</div>
                <div className="music">♪ {v.music} · #{v.tag}</div>
              </div>
            </section>
          );
        })}
      </div>

      <nav className="nav">
        <button className="navItem active" onClick={() => feedRef.current?.scrollTo({ top: 0, behavior: "smooth" })}><HomeIcon /><span>首页</span></button>
        <button className="navItem" onClick={() => router.push("/following")}><Users /><span>关注</span></button>
        <button className="navItem plus" onClick={() => router.push("/upload")}><span><Plus /></span></button>
        <button className="navItem" onClick={() => router.push("/messages")}><Inbox /><span>消息</span></button>
        <button className="navItem" onClick={() => router.push(userId ? "/profile" : "/auth")}><UserRound /><span>我的</span></button>
      </nav>

      {toast && <div className="toast">{toast}</div>}

      {searchOpen && (
        <div className="modalBackdrop" onClick={() => setSearchOpen(false)}>
          <div className="searchPanel" onClick={e => e.stopPropagation()}>
            <div className="modalHeader"><b>搜索星流</b><button onClick={() => setSearchOpen(false)}><X /></button></div>
            <div className="searchBox"><Search size={20} /><input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="搜索创作者、作品、音乐…" /></div>
            <div className="searchResults">
              {searchResults.length ? searchResults.map(v => {
                const index = feedVideos.findIndex(item => item.id === v.id);
                return <button key={v.id} className="searchResult" onClick={() => jumpToVideo(index)}><span className="resultAvatar">{v.avatar}</span><span><b>@{v.username}</b><small>{v.title || "星流作品"}</small></span></button>;
              }) : <div className="empty">没有找到相关内容</div>}
            </div>
          </div>
        </div>
      )}

      {commentOpen && active && (
        <div className="modalBackdrop" onClick={() => setCommentOpen(false)}>
          <div className="commentPanel" onClick={e => e.stopPropagation()}>
            <div className="modalHeader"><b>评论 {fmt(active.comments)}</b><button onClick={() => setCommentOpen(false)}><X /></button></div>
            <div className="commentList">
              {comments.length ? comments.map(item => <div className="commentItem" key={item.id}><div className="resultAvatar">{item.username.slice(0, 1)}</div><div><b>@{item.username}</b><p>{item.content}</p></div></div>) : <div className="empty">还没有评论，来留下第一句话吧</div>}
            </div>
            <form className="commentForm" onSubmit={submitComment}><input value={comment} onChange={e => setComment(e.target.value)} placeholder="说点什么…" maxLength={300} /><button type="submit">发送</button></form>
          </div>
        </div>
      )}
    </main>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bookmark, Heart, Home as HomeIcon, Inbox, MessageCircle, MoreHorizontal, Play, Plus, Search, Share2, UserRound, Users, Volume2, VolumeX } from "lucide-react";
import { supabase } from "../lib/supabase";

type Video = { id: string; src: string; title: string; music: string; username: string; avatar: string; likes: number; comments: number; userId: string | null };

const demo: Video[] = [
  { id: "demo-1", src: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4", title: "欢迎来到星流，记录生活里值得被看见的瞬间。✨", music: "原创音乐 · 星流", username: "星流用户", avatar: "星", likes: 1280, comments: 86, userId: null },
  { id: "demo-2", src: "https://www.w3schools.com/html/mov_bbb.mp4", title: "今天的快乐很简单：出去走走，看看世界。", music: "星流音乐", username: "小星", avatar: "小", likes: 2356, comments: 132, userId: null },
  { id: "demo-3", src: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4", title: "把普通的一天拍下来，也许它就是最好的故事。", music: "热门BGM · 星流", username: "阿乐", avatar: "乐", likes: 8942, comments: 421, userId: null },
  { id: "demo-4", src: "https://www.w3schools.com/html/mov_bbb.mp4", title: "下一站，去一个没有去过的地方。🌍", music: "旅行歌单", username: "旅行者", avatar: "旅", likes: 15420, comments: 806, userId: null },
];

const fmt = (n: number) => n >= 10000 ? `${(n / 10000).toFixed(n >= 100000 ? 0 : 1)}万` : n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}千` : String(n);

export default function Home() {
  const feedRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const touchStart = useRef(0);
  const [videos, setVideos] = useState<Video[]>(demo);
  const [current, setCurrent] = useState(0);
  const [muted, setMuted] = useState(true);
  const [paused, setPaused] = useState(false);
  const [tab, setTab] = useState<"推荐" | "关注">("推荐");
  const [liked, setLiked] = useState<string[]>([]);
  const [saved, setSaved] = useState<string[]>([]);
  const [followed, setFollowed] = useState<string[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [search, setSearch] = useState(false);
  const [query, setQuery] = useState("");

  const go = (path: string) => { window.location.href = path; };
  const say = (text: string) => { setToast(text); window.setTimeout(() => setToast(""), 1600); };

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!supabase) return;
      const { data: sessionData } = await supabase.auth.getSession();
      if (!alive) return;
      const uid = sessionData.session?.user.id ?? null;
      setUserId(uid);
      const { data } = await supabase.from("videos").select("id,video_url,caption,music,likes_count,comments_count,user_id,profiles(username,display_name,avatar_url)").order("created_at", { ascending: false }).limit(50);
      if (!alive || !data?.length) return;
      setVideos(data.map((v: any) => {
        const p = Array.isArray(v.profiles) ? v.profiles[0] : v.profiles;
        return { id: v.id, src: v.video_url, title: v.caption || "", music: v.music || "原创音乐 · 星流", username: p?.username || p?.display_name || "星流用户", avatar: (p?.display_name || p?.username || "星").slice(0, 1), likes: v.likes_count || 0, comments: v.comments_count || 0, userId: v.user_id || null };
      }));
      if (uid) {
        const [{ data: ls }, { data: fs }] = await Promise.all([
          supabase.from("likes").select("video_id").eq("user_id", uid),
          supabase.from("follows").select("following_id").eq("follower_id", uid),
        ]);
        if (ls) setLiked(ls.map((x: any) => x.video_id));
        if (fs) setFollowed(fs.map((x: any) => x.following_id));
      }
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUserId(session?.user.id ?? null));
    return () => data.subscription.unsubscribe();
  }, []);

  const playOnly = useCallback((index: number) => {
    videoRefs.current.forEach((video, i) => {
      if (!video) return;
      video.muted = muted;
      if (i === index && !paused) video.play().catch(() => {});
      else video.pause();
    });
  }, [muted, paused]);

  useEffect(() => {
    const feed = feedRef.current;
    if (!feed) return;
    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(e => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      const index = Number((visible.target as HTMLElement).dataset.index);
      if (!Number.isNaN(index)) { setCurrent(index); setPaused(false); }
    }, { root: feed, threshold: [0.6, 0.8, 1] });
    feed.querySelectorAll<HTMLElement>("[data-feed-item]").forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [videos.length]);

  useEffect(() => { playOnly(current); }, [current, playOnly]);

  async function toggleLike(v: Video) {
    if (!supabase || !userId) return say("登录后即可点赞");
    if (v.id.startsWith("demo-")) return say("示例视频暂不支持点赞");
    const has = liked.includes(v.id);
    setLiked(x => has ? x.filter(id => id !== v.id) : [...x, v.id]);
    if (has) await supabase.from("likes").delete().eq("video_id", v.id).eq("user_id", userId);
    else await supabase.from("likes").insert({ video_id: v.id, user_id: userId });
  }

  async function toggleFollow(v: Video) {
    if (!supabase || !userId) return say("登录后即可关注");
    if (!v.userId || v.userId === userId) return say("不能关注自己");
    const has = followed.includes(v.userId);
    setFollowed(x => has ? x.filter(id => id !== v.userId) : [...x, v.userId!]);
    if (has) await supabase.from("follows").delete().eq("follower_id", userId).eq("following_id", v.userId);
    else await supabase.from("follows").insert({ follower_id: userId, following_id: v.userId });
  }

  function share(v: Video) {
    if (navigator.share) navigator.share({ title: v.title || "星流视频", url: window.location.href }).catch(() => {});
    else { navigator.clipboard?.writeText(window.location.href); say("链接已复制"); }
  }

  function onTouchStart(e: React.TouchEvent) { touchStart.current = e.touches[0].clientY; }
  function onTouchEnd(e: React.TouchEvent) {
    const delta = touchStart.current - e.changedTouches[0].clientY;
    if (Math.abs(delta) < 45) return;
    const next = Math.max(0, Math.min(videos.length - 1, current + (delta > 0 ? 1 : -1)));
    feedRef.current?.scrollTo({ top: next * window.innerHeight, behavior: "smooth" });
  }

  const filtered = query.trim() ? videos.filter(v => `${v.username}${v.title}${v.music}`.toLowerCase().includes(query.toLowerCase())) : videos;
  const active = videos[current];

  return <main className="xingliu-app">
    <style jsx global>{`
      html,body{margin:0;background:#000}.xingliu-app{height:100dvh;width:100%;overflow:hidden;background:#000;color:#fff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif}.xingliu-feed{height:100%;overflow-y:auto;scroll-snap-type:y mandatory;scrollbar-width:none}.xingliu-feed::-webkit-scrollbar{display:none}.xingliu-item{height:100dvh;min-height:100dvh;position:relative;scroll-snap-align:start;scroll-snap-stop:always;background:#111;overflow:hidden}.xingliu-video{width:100%;height:100%;object-fit:cover;display:block;background:#111}.xingliu-shade{position:absolute;inset:0;pointer-events:none;background:linear-gradient(180deg,rgba(0,0,0,.42),transparent 20%,transparent 55%,rgba(0,0,0,.72) 100%)}.xingliu-top{position:absolute;top:max(14px,env(safe-area-inset-top));left:0;right:0;height:54px;display:flex;align-items:center;justify-content:center;z-index:5}.xingliu-tabs{display:flex;gap:28px;font-size:16px}.xingliu-tab{border:0;background:none;color:rgba(255,255,255,.68);font-weight:600;padding:8px 0}.xingliu-tab.on{color:#fff;font-size:18px;position:relative}.xingliu-tab.on:after{content:"";position:absolute;height:3px;width:22px;background:#fff;border-radius:9px;bottom:0;left:50%;transform:translateX(-50%)}.xingliu-search{position:absolute;right:16px;top:8px;width:40px;height:40px;border:0;border-radius:50%;background:rgba(0,0,0,.28);color:#fff;display:grid;place-items:center}.xingliu-sound{position:absolute;right:16px;top:70px;width:42px;height:42px;border:0;border-radius:50%;background:rgba(0,0,0,.32);color:#fff;display:grid;place-items:center;z-index:5}.xingliu-pause{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:76px;height:76px;border:0;border-radius:50%;background:rgba(0,0,0,.42);color:#fff;display:grid;place-items:center;z-index:6}.xingliu-actions{position:absolute;right:12px;bottom:116px;z-index:5;display:flex;flex-direction:column;align-items:center;gap:18px}.xingliu-action{border:0;background:none;color:#fff;display:flex;flex-direction:column;align-items:center;gap:4px;font-size:12px;text-shadow:0 1px 3px #000}.xingliu-circle{width:50px;height:50px;border-radius:50%;background:rgba(0,0,0,.28);display:grid;place-items:center}.xingliu-like{color:#ff2f55}.xingliu-saved{color:#ffd43b}.xingliu-disc{width:42px;height:42px;border-radius:50%;background:linear-gradient(135deg,#222,#777);border:3px solid rgba(255,255,255,.75);display:grid;place-items:center;font-weight:700}.xingliu-info{position:absolute;left:16px;right:82px;bottom:92px;z-index:5}.xingliu-author{display:flex;align-items:center;gap:9px;margin-bottom:12px}.xingliu-avatar{width:44px;height:44px;border-radius:50%;border:2px solid #fff;background:#222;color:#fff;font-weight:800;display:grid;place-items:center;overflow:hidden}.xingliu-name{border:0;background:none;color:#fff;font-size:17px;font-weight:800;padding:0;text-shadow:0 1px 3px #000}.xingliu-follow{border:1px solid rgba(255,255,255,.8);background:#fff;color:#111;border-radius:7px;padding:5px 10px;font-weight:700}.xingliu-follow.done{background:rgba(0,0,0,.25);color:#fff}.xingliu-title{font-size:16px;line-height:1.55;font-weight:500;text-shadow:0 1px 4px #000}.xingliu-music{margin-top:8px;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.xingliu-nav{position:fixed;z-index:20;left:0;right:0;bottom:0;height:64px;padding-bottom:env(safe-area-inset-bottom);background:rgba(0,0,0,.72);backdrop-filter:blur(14px);display:flex;align-items:center;justify-content:space-around}.xingliu-nav button{color:#fff}.xingliu-navitem{border:0;background:none;display:flex;flex-direction:column;align-items:center;gap:2px;font-size:10px;opacity:.9}.xingliu-navitem svg{width:22px;height:22px}.xingliu-publish{width:48px;height:34px;border:0;border-radius:9px;background:#fff;color:#000;display:grid;place-items:center}.xingliu-toast{position:fixed;z-index:50;left:50%;bottom:90px;transform:translateX(-50%);background:rgba(20,20,20,.9);padding:10px 16px;border-radius:20px;font-size:13px}.xingliu-modal{position:fixed;inset:0;z-index:40;background:rgba(0,0,0,.82);backdrop-filter:blur(18px);padding:60px 18px 30px}.xingliu-searchbox{height:48px;background:#fff;color:#111;border-radius:12px;display:flex;align-items:center;padding:0 14px;gap:8px}.xingliu-searchbox input{border:0;outline:0;flex:1;font-size:16px}.xingliu-results{margin-top:20px}.xingliu-result{width:100%;border:0;background:rgba(255,255,255,.1);color:#fff;border-radius:12px;padding:12px;text-align:left;margin-bottom:8px}.xingliu-result b{display:block}.xingliu-result span{opacity:.75}.xingliu-close{position:absolute;right:16px;top:16px;border:0;background:none;color:#fff}
      @media(min-width:700px){.xingliu-feed{max-width:480px;margin:auto}.xingliu-nav{max-width:480px;left:50%;right:auto;width:480px;transform:translateX(-50%)}.xingliu-modal{max-width:480px;left:50%;right:auto;width:444px}}
    `}</style>

    <div ref={feedRef} className="xingliu-feed" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      {videos.map((v, i) => {
        const isLiked = liked.includes(v.id);
        const isSaved = saved.includes(v.id);
        const isFollowed = !!v.userId && followed.includes(v.userId);
        return <section key={v.id} className="xingliu-item" data-feed-item data-index={i}>
          <video ref={el => { videoRefs.current[i] = el; }} className="xingliu-video" src={v.src} muted={muted} loop playsInline preload={i <= 1 ? "auto" : "metadata"} onClick={() => setPaused(x => !x)} />
          <div className="xingliu-shade" />
          <div className="xingliu-top"><div className="xingliu-tabs"><button className={`xingliu-tab ${tab === "关注" ? "on" : ""}`} onClick={() => setTab("关注")}>关注</button><button className={`xingliu-tab ${tab === "推荐" ? "on" : ""}`} onClick={() => setTab("推荐")}>推荐</button></div><button className="xingliu-search" onClick={() => setSearch(true)}><Search size={22}/></button></div>
          <button className="xingliu-sound" onClick={() => setMuted(x => !x)}>{muted ? <VolumeX size={20}/> : <Volume2 size={20}/>}</button>
          {paused && i === current && <button className="xingliu-pause" onClick={() => setPaused(false)}><Play size={34} fill="currentColor"/></button>}
          <aside className="xingliu-actions">
            <button className="xingliu-action" onClick={() => toggleLike(v)}><span className={`xingliu-circle ${isLiked ? "xingliu-like" : ""}`}><Heart size={29} fill={isLiked ? "currentColor" : "none"}/></span><b>{fmt(v.likes + (isLiked ? 1 : 0))}</b></button>
            <button className="xingliu-action" onClick={() => go(`/comments/${v.id}`)}><span className="xingliu-circle"><MessageCircle size={28}/></span><b>{fmt(v.comments)}</b></button>
            <button className="xingliu-action" onClick={() => { setSaved(x => x.includes(v.id) ? x.filter(id => id !== v.id) : [...x, v.id]); say(isSaved ? "已取消收藏" : "已收藏"); }}><span className={`xingliu-circle ${isSaved ? "xingliu-saved" : ""}`}><Bookmark size={27} fill={isSaved ? "currentColor" : "none"}/></span><b>{isSaved ? "已收藏" : "收藏"}</b></button>
            <button className="xingliu-action" onClick={() => share(v)}><span className="xingliu-circle"><Share2 size={27}/></span><b>分享</b></button>
            <div className="xingliu-disc">♪</div>
          </aside>
          <div className="xingliu-info">
            <div className="xingliu-author"><button className="xingliu-avatar" onClick={() => v.userId ? go(`/u/${v.userId}`) : say("演示用户没有个人主页")}>{v.avatar}</button><button className="xingliu-name" onClick={() => v.userId ? go(`/u/${v.userId}`) : say("演示用户没有个人主页")}>@{v.username}</button>{v.userId && v.userId !== userId && <button className={`xingliu-follow ${isFollowed ? "done" : ""}`} onClick={() => toggleFollow(v)}>{isFollowed ? "已关注" : "+ 关注"}</button>}</div>
            <div className="xingliu-title">{v.title}</div><div className="xingliu-music">♪ {v.music}</div>
          </div>
        </section>;
      })}
    </div>

    <nav className="xingliu-nav"><button className="xingliu-navitem" onClick={() => feedRef.current?.scrollTo({ top: 0, behavior: "smooth" })}><HomeIcon/><span>首页</span></button><button className="xingliu-navitem" onClick={() => go("/following")}><Users/><span>关注</span></button><button className="xingliu-publish" onClick={() => go(userId ? "/upload" : "/auth")}><Plus size={28}/></button><button className="xingliu-navitem" onClick={() => go("/messages")}><Inbox/><span>消息</span></button><button className="xingliu-navitem" onClick={() => go(userId ? "/profile" : "/auth")}><UserRound/><span>我</span></button></nav>
    {toast && <div className="xingliu-toast">{toast}</div>}

    {search && <div className="xingliu-modal"><button className="xingliu-close" onClick={() => setSearch(false)}>关闭</button><div className="xingliu-searchbox"><Search size={19}/><input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="搜索用户、视频、音乐"/></div><div className="xingliu-results">{query ? filtered.map(v => <button className="xingliu-result" key={v.id} onClick={() => { setSearch(false); const idx = videos.findIndex(x => x.id === v.id); feedRef.current?.scrollTo({ top: idx * window.innerHeight, behavior: "smooth" }); }}><b>@{v.username}</b><span>{v.title}</span></button>) : <><p>大家都在搜</p>{["旅行", "美食", "日常", "AI", "音乐", "宠物"].map(x => <button className="xingliu-result" key={x} onClick={() => setQuery(x)}>#{x}</button>)}</>}</div></div>}
  </main>;
}

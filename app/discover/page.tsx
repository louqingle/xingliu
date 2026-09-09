"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Flame, Heart, MessageCircle, Play, Search, UserRound } from "lucide-react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

type Video = {
  id: string;
  url: string;
  title: string;
  music: string;
  likes: number;
  comments: number;
  createdAt: string;
  userId: string;
  username: string;
  avatarUrl: string | null;
};

type Creator = {
  id: string;
  username: string;
  nickname: string | null;
  avatarUrl: string | null;
  works: number;
  likes: number;
};

const fmt = (n: number) => n >= 10000 ? `${(n / 10000).toFixed(1)}万` : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);

export default function DiscoverPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [playing, setPlaying] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!supabase) return;
      const r = await supabase
        .from("videos")
        .select("id,url,title,music,like_count,comment_count,user_id,created_at")
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(100);
      if (!alive || r.error) {
        setLoading(false);
        return;
      }
      const rows = r.data || [];
      const ids = [...new Set(rows.map((v: any) => v.user_id))];
      let profiles: any[] = [];
      if (ids.length) {
        const p = await supabase.from("profiles").select("id,username,nickname,avatar_url").in("id", ids);
        profiles = p.data || [];
      }
      const mapped: Video[] = rows.map((v: any) => {
        const p = profiles.find((x) => x.id === v.user_id);
        return {
          id: v.id,
          url: v.url,
          title: v.title || "分享一个瞬间",
          music: v.music || "原创音乐 · 星流",
          likes: v.like_count || 0,
          comments: v.comment_count || 0,
          createdAt: v.created_at,
          userId: v.user_id,
          username: p?.username || p?.nickname || "星流用户",
          avatarUrl: p?.avatar_url || null,
        };
      });
      const creatorMap = new Map<string, Creator>();
      for (const v of mapped) {
        const current = creatorMap.get(v.userId) || {
          id: v.userId,
          username: v.username,
          nickname: null,
          avatarUrl: v.avatarUrl,
          works: 0,
          likes: 0,
        };
        current.works += 1;
        current.likes += v.likes;
        creatorMap.set(v.userId, current);
      }
      const scored = [...mapped].sort((a, b) => {
        const hours = (date: string) => Math.max(0, (Date.now() - new Date(date).getTime()) / 3600000);
        const score = (v: Video) => v.likes * 2.2 + v.comments * 3.5 + Math.max(0, 72 - hours(v.createdAt)) * 1.2;
        return score(b) - score(a);
      });
      setVideos(scored);
      setCreators([...creatorMap.values()].sort((a, b) => b.likes - a.likes).slice(0, 8));
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  const filtered = useMemo(() => {
    const text = q.trim().toLowerCase();
    return text ? videos.filter((v) => `${v.username} ${v.title} ${v.music}`.toLowerCase().includes(text)) : videos;
  }, [videos, q]);

  return (
    <main className="discover-page">
      <header className="discover-header">
        <Link href="/" className="back"><ArrowLeft size={21} /></Link>
        <div><strong>发现</strong><span>全站热门内容</span></div>
        <button className="header-search" onClick={() => document.getElementById("discover-search")?.focus()}><Search size={20} /></button>
      </header>

      <div className="discover-scroll">
        <div className="discover-search"><Search size={17} /><input id="discover-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索视频、创作者" /></div>

        {!q && <section className="hot-title"><div><Flame size={19} /><b>热门创作者</b></div><span>正在上升</span></section>}
        {!q && <div className="creator-row">{creators.map((c) => <Link href={`/u/${c.id}`} className="creator-card" key={c.id}><div className="creator-avatar">{c.avatarUrl ? <img src={c.avatarUrl} alt="" /> : c.username.slice(0, 1)}</div><b>@{c.username}</b><span>{fmt(c.likes)} 获赞</span></Link>)}</div>}

        <section className="hot-title video-title"><div><Flame size={19} /><b>{q ? `搜索结果 · ${q}` : "正在爆火"}</b></div><span>{filtered.length} 个作品</span></section>
        {loading ? <div className="discover-empty">正在发现全网热门内容…</div> : filtered.length === 0 ? <div className="discover-empty">没有找到相关内容</div> : <div className="video-grid">{filtered.map((v) => <article className="discover-card" key={v.id}>
          <div className="discover-video-wrap" onClick={() => setPlaying((x) => x === v.id ? null : v.id)}>
            <video src={v.url} playsInline muted={!playing || playing !== v.id} autoPlay={playing === v.id} loop preload="metadata" onPlay={() => setPlaying(v.id)} />
            <span className="play-pill"><Play size={13} fill="currentColor" /> 热门</span>
          </div>
          <div className="discover-copy"><div className="discover-user"><Link href={`/u/${v.userId}`}><span className="mini-avatar">{v.avatarUrl ? <img src={v.avatarUrl} alt="" /> : v.username.slice(0, 1)}</span><b>@{v.username}</b></Link></div><h3>{v.title}</h3><p>♫ {v.music}</p><div className="discover-stats"><span><Heart size={14} /> {fmt(v.likes)}</span><span><MessageCircle size={14} /> {fmt(v.comments)}</span></div></div>
        </article>)}</div>}
      </div>

      <nav className="discover-nav"><Link href="/" className="nav-active"><span>⌂</span>首页</Link><Link href="/discover" className="nav-active"><span>◉</span>发现</Link><Link href="/upload" className="nav-plus">+</Link><Link href="/messages"><span>◌</span>消息</Link><Link href="/profile"><UserRound size={20} /><span>我</span></Link></nav>

      <style>{`
        *{box-sizing:border-box}.discover-page{min-height:100dvh;background:#050505;color:#fff}.discover-header{position:sticky;top:0;z-index:20;height:66px;padding:0 15px;display:flex;align-items:center;justify-content:space-between;background:rgba(5,5,5,.88);backdrop-filter:blur(20px);border-bottom:1px solid rgba(255,255,255,.06)}.discover-header>div{display:flex;flex-direction:column;align-items:center;gap:2px}.discover-header strong{font-size:18px}.discover-header span{font-size:10px;color:#777}.back,.header-search{width:38px;height:38px;display:grid;place-items:center;color:#fff;background:rgba(255,255,255,.06);border:0;border-radius:50%}.discover-scroll{max-width:760px;margin:auto;padding:14px 14px 100px}.discover-search{height:44px;border-radius:15px;background:#151515;border:1px solid rgba(255,255,255,.07);display:flex;align-items:center;gap:9px;padding:0 13px;color:#777}.discover-search input{flex:1;background:transparent;border:0;outline:0;color:#fff;font-size:14px}.hot-title{display:flex;justify-content:space-between;align-items:center;margin:20px 2px 12px}.hot-title>div{display:flex;align-items:center;gap:7px}.hot-title>div svg{color:#ff4b55}.hot-title span{font-size:11px;color:#666}.creator-row{display:flex;gap:10px;overflow:auto;padding:2px 0 6px;scrollbar-width:none}.creator-row::-webkit-scrollbar{display:none}.creator-card{min-width:106px;padding:13px 8px;text-align:center;border:1px solid rgba(255,255,255,.07);background:linear-gradient(180deg,#151515,#0d0d0d);border-radius:17px;color:#fff}.creator-avatar{width:52px;height:52px;border-radius:50%;overflow:hidden;margin:0 auto 8px;display:grid;place-items:center;background:#222;font-weight:700}.creator-avatar img,.mini-avatar img{width:100%;height:100%;object-fit:cover}.creator-card b{display:block;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.creator-card span{display:block;margin-top:4px;color:#777;font-size:10px}.video-title{margin-top:24px}.video-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.discover-card{overflow:hidden;border:1px solid rgba(255,255,255,.07);border-radius:17px;background:#0e0e0e}.discover-video-wrap{height:245px;position:relative;background:#171717;overflow:hidden}.discover-video-wrap video{width:100%;height:100%;object-fit:cover;display:block}.play-pill{position:absolute;top:10px;left:10px;display:flex;align-items:center;gap:4px;padding:5px 8px;border-radius:99px;background:rgba(0,0,0,.52);font-size:10px}.discover-copy{padding:10px 11px 12px}.discover-user a{display:flex;align-items:center;gap:6px;color:#fff;font-size:11px}.mini-avatar{width:24px;height:24px;border-radius:50%;overflow:hidden;background:#222;display:grid;place-items:center;font-size:10px}.discover-copy h3{font-size:14px;margin:8px 0 4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.discover-copy p{font-size:10px;color:#777;margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.discover-stats{display:flex;gap:12px;margin-top:8px;color:#888;font-size:10px}.discover-stats span{display:flex;align-items:center;gap:4px}.discover-empty{text-align:center;color:#777;padding:80px 0;font-size:13px}.discover-nav{position:fixed;z-index:50;left:0;right:0;bottom:0;height:72px;padding:6px 16px env(safe-area-inset-bottom);display:grid;grid-template-columns:1fr 1fr 1fr 1fr 1fr;align-items:center;background:rgba(8,8,8,.94);backdrop-filter:blur(22px);border-top:1px solid rgba(255,255,255,.08)}.discover-nav>a{height:48px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;color:#777;font-size:10px}.discover-nav .nav-active{color:#fff}.discover-nav .nav-plus{width:44px;height:30px;margin:auto;border-radius:9px;background:#fff;color:#000;font-size:25px;line-height:25px;font-weight:300}.discover-nav span{font-size:18px;line-height:18px}@media(max-width:430px){.video-grid{gap:9px}.discover-video-wrap{height:230px}.discover-scroll{padding-left:11px;padding-right:11px}}
      `}</style>
    </main>
  );
}

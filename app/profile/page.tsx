"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Grid3X3, Heart, LogOut, Play, Settings, UserRound } from "lucide-react";
import { supabase } from "../../lib/supabase";

type Profile = { username: string; display_name: string; avatar_url: string | null; bio: string | null };
type Video = { id: string; video_url: string; caption: string; likes_count: number; comments_count: number; created_at: string };

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const [likes, setLikes] = useState(0);
  const [tab, setTab] = useState<"works" | "liked">("works");
  const [likedVideos, setLikedVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!supabase) { router.replace("/auth"); return; }
      const { data: sessionData } = await supabase.auth.getSession();
      const id = sessionData.session?.user.id;
      if (!id) { router.replace("/auth"); return; }

      const [{ data: p }, { data: works }, { data: fs }, { data: fg }, { data: liked }] = await Promise.all([
        supabase.from("profiles").select("username,display_name,avatar_url,bio").eq("id", id).maybeSingle(),
        supabase.from("videos").select("id,video_url,caption,likes_count,comments_count,created_at").eq("user_id", id).order("created_at", { ascending: false }),
        supabase.from("follows").select("follower_id", { count: "exact", head: true }).eq("following_id", id),
        supabase.from("follows").select("following_id", { count: "exact", head: true }).eq("follower_id", id),
        supabase.from("likes").select("video_id").eq("user_id", id),
      ]);
      if (!alive) return;
      setProfile(p || { username: "xingliu", display_name: "星流用户", avatar_url: null, bio: "记录生活，分享美好。" });
      setVideos(works || []);
      setFollowers(fs?.length ?? 0);
      setFollowing(fg?.length ?? 0);
      const likedIds = (liked || []).map((x: any) => x.video_id);
      if (likedIds.length) {
        const { data: lv } = await supabase.from("videos").select("id,video_url,caption,likes_count,comments_count,created_at").in("id", likedIds).order("created_at", { ascending: false });
        if (alive) setLikedVideos(lv || []);
      }
      setLikes((works || []).reduce((sum: number, v: Video) => sum + (v.likes_count || 0), 0));
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [router]);

  async function logout() {
    if (!supabase) return;
    setLoggingOut(true);
    await supabase.auth.signOut();
    localStorage.removeItem("xingliu-current-user");
    router.replace("/auth");
  }

  if (loading) return <main className="profile-loading">加载中…</main>;
  if (!profile) return null;

  const list = tab === "works" ? videos : likedVideos;
  const initial = (profile.display_name || profile.username || "星").slice(0, 1).toUpperCase();

  return <main className="profile-page">
    <header className="profile-header"><button className="back-button" onClick={() => router.push("/")}><ArrowLeft size={21}/></button><strong>个人主页</strong><button className="more-button"><Settings size={20}/></button></header>
    <section className="profile-top">
      <div className="profile-avatar">{profile.avatar_url ? <img src={profile.avatar_url} alt="头像"/> : initial}</div>
      <h1>{profile.display_name || profile.username}</h1><p>@{profile.username}</p>
      <p className="profile-bio">{profile.bio || "记录生活，分享美好。"}</p>
      <button className="edit-button">编辑资料</button>
    </section>
    <section className="stats"><div><strong>{following}</strong><span>关注</span></div><div><strong>{followers}</strong><span>粉丝</span></div><div><strong>{fmt(likes)}</strong><span>获赞</span></div></section>
    <section className="profile-tabs"><button className={tab === "works" ? "active" : ""} onClick={() => setTab("works")}><Grid3X3 size={18}/>作品 {videos.length}</button><button className={tab === "liked" ? "active" : ""} onClick={() => setTab("liked")}><Heart size={18}/>点赞</button></section>
    {list.length ? <section className="works-grid">{list.map(v => <button className="work-card" key={v.id} onClick={() => router.push(`/?video=${v.id}`)}><video src={v.video_url} muted playsInline preload="metadata"/><span className="playBadge"><Play size={14} fill="white"/></span><span className="workStats"><Heart size={13} fill="white"/> {fmt(v.likes_count || 0)}</span></button>)}</section> : <section className="empty-content"><div className="empty-icon"><VideoIcon/></div><h2>{tab === "works" ? "还没有作品" : "还没有点赞作品"}</h2><p>{tab === "works" ? "发布你的第一个视频吧" : "去首页发现喜欢的作品"}</p>{tab === "works" && <button className="publish-button" onClick={() => router.push("/upload")}>发布视频</button>}</section>}
    <button className="logout-button" disabled={loggingOut} onClick={logout}><LogOut size={18}/>{loggingOut ? "正在退出…" : "退出登录"}</button>
    <nav className="profile-bottom"><button onClick={() => router.push("/")}><UserRound size={20}/><span>首页</span></button><button className="plus" onClick={() => router.push("/upload")}>＋</button><button className="selected"><UserRound size={20}/><span>我</span></button></nav>
  </main>;
}
function VideoIcon(){return <span style={{fontSize:28}}>＋</span>}
function fmt(n:number){return n>=10000?(n/10000).toFixed(1).replace(".0","")+"万":n.toLocaleString("zh-CN")}

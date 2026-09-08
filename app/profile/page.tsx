"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Grid3X3, Heart, LogOut, Play, Settings, UserRound, Video as VideoIcon, Pencil, X, Check } from "lucide-react";
import { supabase } from "../../lib/supabase";

type Profile = { username: string; display_name: string; avatar_url: string | null; bio: string | null };
type Video = { id: string; url: string; title: string; music: string | null; like_count: number; comment_count: number; created_at: string };

type FollowedUser = { id: string; username: string; display_name: string; avatar_url: string | null };

export default function ProfilePage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [likedVideos, setLikedVideos] = useState<Video[]>([]);
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const [likes, setLikes] = useState(0);
  const [tab, setTab] = useState<"works" | "liked">("works");
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [toast, setToast] = useState("");

  async function loadProfile(id: string) {
    if (!supabase) return;
    const [{ data: p }, { data: works }, { count: followerCount }, { count: followingCount }, { data: liked }] = await Promise.all([
      supabase.from("profiles").select("username,display_name,avatar_url,bio").eq("id", id).maybeSingle(),
      supabase.from("videos").select("id,url,title,music,like_count,comment_count,created_at").eq("user_id", id).order("created_at", { ascending: false }),
      supabase.from("follows").select("follower_id", { count: "exact", head: true }).eq("following_id", id),
      supabase.from("follows").select("following_id", { count: "exact", head: true }).eq("follower_id", id),
      supabase.from("likes").select("video_id").eq("user_id", id),
    ]);

    setProfile(p || { username: "xingliu", display_name: "星流用户", avatar_url: null, bio: "记录生活，分享美好。" });
    setVideos(works || []);
    setFollowers(followerCount || 0);
    setFollowing(followingCount || 0);
    setLikes((works || []).reduce((sum: number, v: Video) => sum + (v.like_count || 0), 0));

    const likedIds = (liked || []).map((x: any) => x.video_id);
    if (likedIds.length) {
      const { data: lv } = await supabase.from("videos").select("id,url,title,music,like_count,comment_count,created_at").in("id", likedIds).order("created_at", { ascending: false });
      setLikedVideos(lv || []);
    } else {
      setLikedVideos([]);
    }
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!supabase) { router.replace("/auth"); return; }
      const { data: sessionData } = await supabase.auth.getSession();
      const id = sessionData.session?.user.id;
      if (!id) { router.replace("/auth"); return; }
      setUserId(id);
      await loadProfile(id);
      if (alive) setLoading(false);
    })();
    return () => { alive = false; };
  }, [router]);

  function openEdit() {
    setDisplayName(profile?.display_name || "");
    setBio(profile?.bio || "");
    setSaveError("");
    setEditing(true);
  }

  async function saveProfile() {
    if (!supabase || !userId) return;
    const name = displayName.trim().slice(0, 30);
    const nextBio = bio.trim().slice(0, 120);
    if (!name) { setSaveError("昵称不能为空"); return; }
    setSaving(true);
    setSaveError("");
    const { error } = await supabase.from("profiles").update({ display_name: name, bio: nextBio || null }).eq("id", userId);
    if (error) {
      setSaveError(`保存失败：${error.message}`);
      setSaving(false);
      return;
    }
    setProfile(prev => prev ? { ...prev, display_name: name, bio: nextBio || null } : prev);
    setEditing(false);
    setSaving(false);
    setToast("资料已保存");
    window.setTimeout(() => setToast(""), 1800);
  }

  async function logout() {
    if (!supabase) return;
    setLoggingOut(true);
    await supabase.auth.signOut();
    localStorage.removeItem("xingliu-current-user");
    router.replace("/auth");
  }

  const list = useMemo(() => tab === "works" ? videos : likedVideos, [tab, videos, likedVideos]);
  const initial = (profile?.display_name || profile?.username || "星").slice(0, 1).toUpperCase();

  if (loading) return <main className="profile-loading">加载中…</main>;
  if (!profile) return null;

  return <main className="profile-page">
    <header className="profile-header">
      <button className="back-button" onClick={() => router.push("/")}><ArrowLeft size={21}/></button>
      <strong>个人主页</strong>
      <button className="more-button" onClick={openEdit}><Settings size={20}/></button>
    </header>

    <section className="profile-top">
      <div className="profile-avatar">{profile.avatar_url ? <img src={profile.avatar_url} alt="头像"/> : initial}</div>
      <h1>{profile.display_name || profile.username}</h1>
      <p>@{profile.username}</p>
      <p className="profile-bio">{profile.bio || "记录生活，分享美好。"}</p>
      <button className="edit-button" onClick={openEdit}><Pencil size={15}/> 编辑资料</button>
    </section>

    <section className="stats">
      <div><strong>{following}</strong><span>关注</span></div>
      <div><strong>{followers}</strong><span>粉丝</span></div>
      <div><strong>{fmt(likes)}</strong><span>获赞</span></div>
    </section>

    <section className="profile-tabs">
      <button className={tab === "works" ? "active" : ""} onClick={() => setTab("works")}><Grid3X3 size={18}/>作品 {videos.length}</button>
      <button className={tab === "liked" ? "active" : ""} onClick={() => setTab("liked")}><Heart size={18}/>点赞 {likedVideos.length}</button>
    </section>

    {list.length ? <section className="works-grid">{list.map(v => <button className="work-card" key={v.id} onClick={() => router.push(`/?video=${v.id}`)}>
      <video src={v.url} muted playsInline preload="metadata"/>
      <span className="playBadge"><Play size={14} fill="white"/></span>
      <span className="workStats"><Heart size={13} fill="white"/> {fmt(v.like_count || 0)}</span>
    </button>)}</section> : <section className="empty-content">
      <div className="empty-icon"><VideoIcon size={28}/></div>
      <h2>{tab === "works" ? "还没有作品" : "还没有点赞作品"}</h2>
      <p>{tab === "works" ? "发布你的第一个视频吧" : "去首页发现喜欢的作品"}</p>
      {tab === "works" ? <button className="publish-button" onClick={() => router.push("/upload")}>发布视频</button> : <button className="publish-button" onClick={() => router.push("/")}>去发现</button>}
    </section>}

    <button className="logout-button" disabled={loggingOut} onClick={logout}><LogOut size={18}/>{loggingOut ? "正在退出…" : "退出登录"}</button>

    <nav className="profile-bottom">
      <button onClick={() => router.push("/")}><UserRound size={20}/><span>首页</span></button>
      <button className="plus" onClick={() => router.push("/upload")}>＋</button>
      <button className="selected"><UserRound size={20}/><span>我</span></button>
    </nav>

    {editing && <div className="profile-edit-overlay" onClick={() => !saving && setEditing(false)}>
      <section className="profile-edit-sheet" onClick={e => e.stopPropagation()}>
        <header><strong>编辑资料</strong><button onClick={() => !saving && setEditing(false)}><X size={20}/></button></header>
        <label>昵称<input value={displayName} maxLength={30} onChange={e => setDisplayName(e.target.value)}/></label>
        <label>个人简介<textarea value={bio} maxLength={120} onChange={e => setBio(e.target.value)}/></label>
        <div className="editCount">{bio.length}/120</div>
        {saveError && <div className="profileSaveError">{saveError}</div>}
        <button className="saveProfileBtn" disabled={saving} onClick={saveProfile}>{saving ? "保存中…" : <><Check size={18}/> 保存资料</>}</button>
      </section>
    </div>}

    {toast && <div className="toast">{toast}</div>}
  </main>;
}

function fmt(n: number) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString("zh-CN");
}

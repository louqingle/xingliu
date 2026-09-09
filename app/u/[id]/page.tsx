"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Grid3X3, Heart, MessageCircle, Send, UserCheck, UserPlus, Play } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type Profile = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
};

type Video = {
  id: string;
  url: string;
  title: string | null;
  cover_url: string | null;
  like_count: number;
  comment_count: number;
};

function VideoThumb({ video }: { video: Video }) {
  const [thumb, setThumb] = useState(video.cover_url || "");
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (video.cover_url || !video.url) return;
    const el = videoRef.current;
    if (!el) return;

    let done = false;
    const capture = () => {
      if (done || !el.videoWidth || !el.videoHeight) return;
      try {
        const targetW = 720;
        const targetH = 1280;
        const scale = Math.max(targetW / el.videoWidth, targetH / el.videoHeight);
        const drawW = el.videoWidth * scale;
        const drawH = el.videoHeight * scale;
        const canvas = document.createElement("canvas");
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.fillStyle = "#080808";
        ctx.fillRect(0, 0, targetW, targetH);
        ctx.drawImage(el, (targetW - drawW) / 2, (targetH - drawH) / 2, drawW, drawH);
        const data = canvas.toDataURL("image/jpeg", 0.8);
        if (data.length > 1000) {
          done = true;
          setThumb(data);
          el.pause();
        }
      } catch {
        // Some browsers can block canvas extraction from remote media; the video remains as a fallback.
      }
    };

    const onLoaded = () => {
      const target = Number.isFinite(el.duration) && el.duration > 0.5 ? Math.min(0.5, el.duration * 0.12) : 0;
      try {
        el.currentTime = target;
      } catch {
        capture();
      }
    };

    el.addEventListener("loadedmetadata", onLoaded);
    el.addEventListener("seeked", capture);
    el.addEventListener("loadeddata", capture);
    el.load();
    return () => {
      el.removeEventListener("loadedmetadata", onLoaded);
      el.removeEventListener("seeked", capture);
      el.removeEventListener("loadeddata", capture);
    };
  }, [video.cover_url, video.url]);

  if (thumb) {
    return <img className="work-thumb" src={thumb} alt="作品封面" />;
  }

  return (
    <video
      ref={videoRef}
      className="work-thumb work-thumb-video"
      src={video.url}
      muted
      playsInline
      preload="metadata"
    />
  );
}

export default function UserProfilePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const [likes, setLikes] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [me, setMe] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!supabase) {
        setLoading(false);
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user.id || null;
      if (!active) return;
      setMe(uid);

      const [{ data: p }, { data: works }, { count: fc }, { count: fg }] = await Promise.all([
        supabase.from("profiles").select("id,username,display_name,avatar_url,bio").eq("id", id).maybeSingle(),
        supabase.from("videos").select("id,url,title,cover_url,like_count,comment_count").eq("user_id", id).eq("status", "published").order("created_at", { ascending: false }),
        supabase.from("follows").select("follower_id", { count: "exact", head: true }).eq("following_id", id),
        supabase.from("follows").select("following_id", { count: "exact", head: true }).eq("follower_id", id),
      ]);

      if (!active) return;
      if (!p) {
        setLoading(false);
        return;
      }
      setProfile(p as Profile);
      setVideos((works || []) as Video[]);
      setFollowers(fc || 0);
      setFollowing(fg || 0);
      setLikes(((works || []) as Video[]).reduce((sum, v) => sum + (v.like_count || 0), 0));

      if (uid && uid !== id) {
        const { data: f } = await supabase.from("follows").select("following_id").eq("follower_id", uid).eq("following_id", id).maybeSingle();
        if (active) setIsFollowing(!!f);
      }
      setLoading(false);
    })();
    return () => { active = false; };
  }, [id]);

  async function follow() {
    if (!supabase || !me) {
      router.push("/auth");
      return;
    }
    if (me === id) return;
    setWorking(true);
    if (isFollowing) {
      await supabase.from("follows").delete().eq("follower_id", me).eq("following_id", id);
      setIsFollowing(false);
      setFollowers(x => Math.max(0, x - 1));
    } else {
      const { error } = await supabase.from("follows").insert({ follower_id: me, following_id: id });
      if (!error) {
        setIsFollowing(true);
        setFollowers(x => x + 1);
      }
    }
    setWorking(false);
  }

  async function message() {
    if (!supabase || !me) {
      router.push("/auth");
      return;
    }
    const { data, error } = await supabase.rpc("ensure_conversation", { p_user_id: id });
    if (error) {
      alert(error.message);
      return;
    }
    router.push(`/messages/${data}`);
  }

  if (loading) return <main className="profile-loading">加载中…</main>;
  if (!profile) return <main className="profile-loading">用户不存在</main>;

  const initial = (profile.display_name || profile.username || "星").slice(0, 1).toUpperCase();

  return (
    <main className="profile-page">
      <header className="profile-header">
        <button className="back-button" onClick={() => router.back()} aria-label="返回"><ArrowLeft size={21} /></button>
        <strong>@{profile.username}</strong>
        <span />
      </header>

      <section className="profile-top">
        <div className="profile-avatar">{profile.avatar_url ? <img src={profile.avatar_url} alt="头像" /> : initial}</div>
        <h1>{profile.display_name || profile.username}</h1>
        <p>@{profile.username}</p>
        <p className="profile-bio">{profile.bio || "记录生活，分享美好。"}</p>
        <div className="profile-actions">
          <button className={isFollowing ? "profile-follow following" : "profile-follow"} disabled={working || me === id} onClick={follow}>
            {isFollowing ? <><UserCheck size={17} />已关注</> : <><UserPlus size={17} />关注</>}
          </button>
          {me !== id && <button className="profile-message" onClick={message}><MessageCircle size={17} />私信</button>}
        </div>
      </section>

      <section className="stats">
        <div><strong>{following}</strong><span>关注</span></div>
        <div><strong>{followers}</strong><span>粉丝</span></div>
        <div><strong>{fmt(likes)}</strong><span>获赞</span></div>
      </section>

      <section className="profile-tabs">
        <button className="active"><Grid3X3 size={18} />作品 {videos.length}</button>
        <button onClick={message}><Send size={17} />发私信</button>
      </section>

      {videos.length ? (
        <section className="works-grid">
          {videos.map(v => (
            <button className="work-card" key={v.id} onClick={() => router.push(`/video/${v.id}`)} aria-label={v.title || "打开作品"}>
              <VideoThumb video={v} />
              <span className="workShade" />
              <span className="playBadge"><Play size={14} fill="white" /></span>
              <span className="workStats"><Heart size={13} fill="white" /> {fmt(v.like_count || 0)}</span>
            </button>
          ))}
        </section>
      ) : (
        <section className="empty-content">
          <div className="empty-icon"><Grid3X3 size={27} /></div>
          <h2>还没有作品</h2>
          <p>这个用户还没有发布视频</p>
        </section>
      )}

      <nav className="profile-bottom">
        <button onClick={() => router.push("/")}><Grid3X3 size={20} /><span>首页</span></button>
        <button className="plus" onClick={() => router.push(me ? "/upload" : "/auth")}>＋</button>
        <button onClick={() => router.push("/messages")}><MessageCircle size={20} /><span>消息</span></button>
      </nav>
    </main>
  );
}

function fmt(n: number) {
  return n >= 10000 ? (n / 10000).toFixed(1).replace(".0", "") + "万" : n.toLocaleString("zh-CN");
}

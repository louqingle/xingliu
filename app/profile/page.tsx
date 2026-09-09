"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Bookmark, Camera, Check, Grid3X3, Heart, Image as ImageIcon, LogOut, Pencil, Play, Settings, ShieldCheck, Upload, UserRound, Video as VideoIcon, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type Profile = {
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
};

type Video = {
  id: string;
  url: string;
  title: string;
  music: string | null;
  cover_url: string | null;
  like_count: number;
  comment_count: number;
  created_at: string;
};

function VideoThumb({ video }: { video: Video }) {
  const [thumb, setThumb] = useState(video.cover_url || "");
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    setThumb(video.cover_url || "");
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
        // Cross-origin media may block canvas extraction. The video remains the fallback.
      }
    };

    const onLoaded = () => {
      const target = Number.isFinite(el.duration) && el.duration > 0.5 ? Math.min(0.5, el.duration * 0.12) : 0;
      try { el.currentTime = target; } catch { capture(); }
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

  if (thumb) return <img className="work-thumb" src={thumb} alt="作品封面" />;
  return <video ref={videoRef} className="work-thumb work-thumb-video" src={video.url} crossOrigin="anonymous" muted playsInline preload="metadata" />;
}

export default function ProfilePage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const coverFileRef = useRef<HTMLInputElement>(null);
  const coverVideoRef = useRef<HTMLVideoElement | null>(null);

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
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [toast, setToast] = useState("");

  const [coverEditing, setCoverEditing] = useState<Video | null>(null);
  const [coverTime, setCoverTime] = useState(0);
  const [coverDuration, setCoverDuration] = useState(0);
  const [coverBusy, setCoverBusy] = useState(false);
  const [coverPreview, setCoverPreview] = useState("");
  const [coverError, setCoverError] = useState("");

  async function loadProfile(id: string) {
    if (!supabase) return;
    const [{ data: p }, { data: works }, { count: followerCount }, { count: followingCount }, { data: liked }] = await Promise.all([
      supabase.from("profiles").select("username,nickname,display_name,avatar_url,bio").eq("id", id).maybeSingle(),
      supabase.from("videos").select("id,url,title,music,cover_url,like_count,comment_count,created_at").eq("user_id", id).order("created_at", { ascending: false }),
      supabase.from("follows").select("follower_id", { count: "exact", head: true }).eq("following_id", id),
      supabase.from("follows").select("following_id", { count: "exact", head: true }).eq("follower_id", id),
      supabase.from("likes").select("video_id").eq("user_id", id),
    ]);

    const normalized = p ? { ...p, display_name: (p as any).display_name || (p as any).nickname || "星流用户" } : null;
    setProfile(normalized || { username: "xingliu", display_name: "星流用户", avatar_url: null, bio: "记录生活，分享美好。" });
    setVideos((works || []) as Video[]);
    setFollowers(followerCount || 0);
    setFollowing(followingCount || 0);
    setLikes(((works || []) as Video[]).reduce((sum, v) => sum + (v.like_count || 0), 0));

    const ids = (liked || []).map((x: any) => x.video_id);
    if (ids.length) {
      const { data: lv } = await supabase.from("videos").select("id,url,title,music,cover_url,like_count,comment_count,created_at").in("id", ids).order("created_at", { ascending: false });
      setLikedVideos((lv || []) as Video[]);
    } else {
      setLikedVideos([]);
    }
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!supabase) { router.replace("/auth"); return; }
      const { data: { session } } = await supabase.auth.getSession();
      const id = session?.user.id;
      if (!id) { router.replace("/auth"); return; }
      setUserId(id);
      await loadProfile(id);
      if (alive) setLoading(false);
    })();
    return () => { alive = false; };
  }, [router]);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 1800);
  }

  function openEdit() {
    setDisplayName(profile?.display_name || "");
    setBio(profile?.bio || "");
    setSaveError("");
    setEditing(true);
  }

  async function uploadAvatar(file: File) {
    if (!supabase || !userId) return;
    if (!file.type.startsWith("image/")) { showToast("请选择图片文件"); return; }
    if (file.size > 5 * 1024 * 1024) { showToast("头像不能超过 5MB"); return; }
    setUploadingAvatar(true);
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { contentType: file.type, cacheControl: "3600", upsert: false });
    if (error) { showToast(`头像上传失败：${error.message}`); setUploadingAvatar(false); return; }
    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    const { error: updateError } = await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", userId);
    if (updateError) {
      await supabase.storage.from("avatars").remove([path]);
      showToast(`头像保存失败：${updateError.message}`);
      setUploadingAvatar(false);
      return;
    }
    setProfile(p => p ? { ...p, avatar_url: publicUrl } : p);
    showToast("头像已更新");
    setUploadingAvatar(false);
  }

  async function saveProfile() {
    if (!supabase || !userId) return;
    const name = displayName.trim().slice(0, 30);
    const nextBio = bio.trim().slice(0, 120);
    if (!name) { setSaveError("昵称不能为空"); return; }
    setSaving(true);
    setSaveError("");
    const { error } = await supabase.from("profiles").update({ nickname: name, display_name: name, bio: nextBio || null }).eq("id", userId);
    if (error) { setSaveError(`保存失败：${error.message}`); setSaving(false); return; }
    setProfile(p => p ? { ...p, display_name: name, bio: nextBio || null } : p);
    setEditing(false);
    setSaving(false);
    showToast("资料已保存");
  }

  function openCoverEditor(video: Video) {
    setCoverEditing(video);
    setCoverTime(0);
    setCoverDuration(0);
    setCoverPreview(video.cover_url || "");
    setCoverError("");
  }

  function closeCoverEditor() {
    if (coverBusy) return;
    setCoverEditing(null);
    setCoverPreview("");
    setCoverError("");
  }

  function captureCover() {
    const video = coverVideoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setCoverError("视频还没加载完成，请稍等一下");
      return null;
    }
    try {
      const targetW = 720;
      const targetH = 1280;
      const scale = Math.max(targetW / video.videoWidth, targetH / video.videoHeight);
      const drawW = video.videoWidth * scale;
      const drawH = video.videoHeight * scale;
      const canvas = document.createElement("canvas");
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.fillStyle = "#080808";
      ctx.fillRect(0, 0, targetW, targetH);
      ctx.drawImage(video, (targetW - drawW) / 2, (targetH - drawH) / 2, drawW, drawH);
      return canvas.toDataURL("image/jpeg", 0.86);
    } catch {
      setCoverError("这个视频暂时不能在浏览器里截取画面，可以改用“上传图片”设置封面");
      return null;
    }
  }

  async function uploadCoverBlob(blob: Blob) {
    if (!supabase || !userId || !coverEditing) return;
    setCoverBusy(true);
    setCoverError("");
    const path = `${userId}/covers/${coverEditing.id}-${crypto.randomUUID()}.jpg`;
    const { error: uploadError } = await supabase.storage.from("videos").upload(path, blob, { contentType: "image/jpeg", cacheControl: "31536000", upsert: false });
    if (uploadError) {
      setCoverError(`封面上传失败：${uploadError.message}`);
      setCoverBusy(false);
      return;
    }
    const { data: { publicUrl } } = supabase.storage.from("videos").getPublicUrl(path);
    const { error: updateError } = await supabase.from("videos").update({ cover_url: publicUrl }).eq("id", coverEditing.id).eq("user_id", userId);
    if (updateError) {
      await supabase.storage.from("videos").remove([path]);
      setCoverError(`封面保存失败：${updateError.message}`);
      setCoverBusy(false);
      return;
    }
    const next = { ...coverEditing, cover_url: publicUrl };
    setCoverEditing(next);
    setCoverPreview(publicUrl);
    setVideos(list => list.map(v => v.id === next.id ? { ...v, cover_url: publicUrl } : v));
    setLikedVideos(list => list.map(v => v.id === next.id ? { ...v, cover_url: publicUrl } : v));
    showToast("封面已保存");
    setCoverBusy(false);
  }

  async function saveFrameCover() {
    const dataUrl = captureCover();
    if (!dataUrl) return;
    const blob = await (await fetch(dataUrl)).blob();
    await uploadCoverBlob(blob);
  }

  async function uploadCustomCover(file: File) {
    if (!file.type.startsWith("image/")) { setCoverError("请选择 JPG、PNG 或 WebP 图片"); return; }
    if (file.size > 8 * 1024 * 1024) { setCoverError("封面图片不能超过 8MB"); return; }
    const preview = URL.createObjectURL(file);
    setCoverPreview(preview);
    await uploadCoverBlob(file);
    URL.revokeObjectURL(preview);
  }

  async function logout() {
    if (!supabase) return;
    setLoggingOut(true);
    const { error } = await supabase.auth.signOut({ scope: "global" });
    if (error) { showToast(`退出失败：${error.message}`); setLoggingOut(false); return; }
    localStorage.removeItem("xingliu-current-user");
    router.replace("/auth");
  }

  const list = useMemo(() => tab === "works" ? videos : likedVideos, [tab, videos, likedVideos]);
  const initial = (profile?.display_name || profile?.username || "星").slice(0, 1).toUpperCase();

  if (loading) return <main className="profile-loading">加载中…</main>;
  if (!profile) return null;

  return (
    <main className="profile-page">
      <style jsx global>{`.profile-avatar{position:relative!important;border:3px solid #fff}.profile-avatar .avatarCamera{position:absolute;right:0;bottom:0;width:28px;height:28px;border-radius:50%;display:grid;place-items:center;background:#fff;color:#111;border:2px solid #070707;box-shadow:0 2px 10px #0008}.profile-avatar:disabled{opacity:.65}.stats>button{width:30%;text-align:center;color:#fff}.stats>button strong,.stats>button span{display:block}.stats>button span{font-size:12px;color:#888;margin-top:3px}.stats>button{border-right:1px solid #ffffff0b}.stats>button:last-child{border:0}`}</style>

      <header className="profile-header">
        <button className="back-button" onClick={() => router.push("/")}><ArrowLeft size={21}/></button>
        <strong>个人主页</strong>
        <button className="more-button" onClick={() => router.push("/settings")}><Settings size={20}/></button>
      </header>

      <section className="profile-top">
        <button className="profile-avatar" onClick={() => fileRef.current?.click()} disabled={uploadingAvatar}>
          {profile.avatar_url ? <img src={profile.avatar_url} alt="头像"/> : initial}
          <span className="avatarCamera"><Camera size={16}/></span>
        </button>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={e => { const f = e.target.files?.[0]; if (f) uploadAvatar(f); e.currentTarget.value = ""; }}/>
        <h1>{profile.display_name || profile.username}</h1>
        <p>@{profile.username}</p>
        <p className="profile-bio">{profile.bio || "记录生活，分享美好。"}</p>
        <div className="profile-actions">
          <button className="edit-button" onClick={openEdit}><Pencil size={15}/> 编辑资料</button>
          <button className="edit-button" onClick={() => router.push("/saved")}><Bookmark size={15}/> 我的收藏</button>
          <button className="edit-button" onClick={() => router.push("/settings")}><ShieldCheck size={15}/> 账号安全</button>
        </div>
      </section>

      <section className="stats">
        <button onClick={() => router.push("/following")}><strong>{following}</strong><span>关注</span></button>
        <button onClick={() => router.push("/followers")}><strong>{followers}</strong><span>粉丝</span></button>
        <button><strong>{fmt(likes)}</strong><span>获赞</span></button>
      </section>

      <section className="profile-tabs">
        <button className={tab === "works" ? "active" : ""} onClick={() => setTab("works")}><Grid3X3 size={18}/>作品 {videos.length}</button>
        <button className={tab === "liked" ? "active" : ""} onClick={() => setTab("liked")}><Heart size={18}/>点赞 {likedVideos.length}</button>
      </section>

      {list.length ? (
        <section className="works-grid">
          {list.map(v => (
            <div className="work-card" key={v.id}>
              <button className="work-open" onClick={() => router.push(`/video/${v.id}`)} aria-label={v.title || "打开作品"}>
                <VideoThumb video={v}/>
                <span className="workShade" />
                <span className="playBadge"><Play size={14} fill="white"/></span>
                <span className="workStats"><Heart size={13} fill="white"/> {fmt(v.like_count || 0)}</span>
              </button>
              {tab === "works" && <button className="coverEditButton" onClick={() => openCoverEditor(v)} aria-label="设置封面"><Pencil size={14}/><span>封面</span></button>}
            </div>
          ))}
        </section>
      ) : (
        <section className="empty-content">
          <div className="empty-icon"><VideoIcon size={28}/></div>
          <h2>{tab === "works" ? "还没有作品" : "还没有点赞作品"}</h2>
          <p>{tab === "works" ? "发布你的第一个视频吧" : "去首页发现喜欢的作品"}</p>
          <button className="publish-button" onClick={() => router.push(tab === "works" ? "/upload" : "/")}>{tab === "works" ? "发布视频" : "去发现"}</button>
        </section>
      )}

      <button className="logout-button" disabled={loggingOut} onClick={logout}><LogOut size={18}/>{loggingOut ? "正在退出所有设备…" : "退出所有设备"}</button>

      <nav className="profile-bottom">
        <button onClick={() => router.push("/")}><UserRound size={20}/><span>首页</span></button>
        <button className="plus" onClick={() => router.push("/upload")}>＋</button>
        <button className="selected"><UserRound size={20}/><span>我</span></button>
      </nav>

      {editing && <div className="profile-edit-overlay" onClick={() => !saving && setEditing(false)}><section className="profile-edit-sheet" onClick={e => e.stopPropagation()}><header><strong>编辑资料</strong><button onClick={() => !saving && setEditing(false)}><X size={20}/></button></header><label>昵称<input value={displayName} maxLength={30} onChange={e => setDisplayName(e.target.value)}/></label><label>个人简介<textarea value={bio} maxLength={120} onChange={e => setBio(e.target.value)}/></label><div className="editCount">{bio.length}/120</div>{saveError && <div className="profileSaveError">{saveError}</div>}<button className="saveProfileBtn" disabled={saving} onClick={saveProfile}>{saving ? "保存中…" : <><Check size={18}/> 保存资料</>}</button></section></div>}

      {coverEditing && <div className="profile-edit-overlay cover-overlay" onClick={closeCoverEditor}><section className="profile-edit-sheet cover-sheet" onClick={e => e.stopPropagation()}><header><strong>设置作品封面</strong><button onClick={closeCoverEditor}><X size={20}/></button></header><div className="cover-preview"><video ref={coverVideoRef} src={coverEditing.url} crossOrigin="anonymous" muted playsInline preload="metadata" onLoadedMetadata={e => { setCoverDuration(e.currentTarget.duration || 0); e.currentTarget.currentTime = Math.min(0.5, Math.max(0, (e.currentTarget.duration || 0) * 0.12)); }} onTimeUpdate={e => setCoverTime(e.currentTarget.currentTime)}/>{coverPreview && <img src={coverPreview} alt="封面预览"/>}<span className="coverPreviewBadge">{coverPreview ? "当前封面" : "视频画面"}</span></div><label className="cover-range-label">选择画面 <strong>{Math.round(coverTime * 10) / 10}s</strong><input type="range" min="0" max={Math.max(0.1, coverDuration)} step="0.1" value={Math.min(coverTime, Math.max(0.1, coverDuration))} onChange={e => { const t = Number(e.target.value); setCoverTime(t); if (coverVideoRef.current) coverVideoRef.current.currentTime = t; }}/></label>{coverError && <div className="profileSaveError">{coverError}</div>}<div className="cover-actions"><button className="cover-secondary" disabled={coverBusy} onClick={() => coverFileRef.current?.click()}><Upload size={17}/> 上传图片</button><button className="saveProfileBtn cover-save" disabled={coverBusy || !coverDuration} onClick={saveFrameCover}>{coverBusy ? "保存中…" : <><ImageIcon size={17}/> 使用当前画面</>}</button></div><input ref={coverFileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={e => { const f = e.target.files?.[0]; if (f) uploadCustomCover(f); e.currentTarget.value = ""; }}/><p className="cover-tip">建议使用竖屏 9:16 图片。视频截帧如果被浏览器的跨域限制拦截，可以直接上传一张图片作为封面。</p></section></div>}

      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}

function fmt(n: number) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString("zh-CN");
}

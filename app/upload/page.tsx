"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, Loader2, Music2, Video, X } from "lucide-react";
import { supabase } from "../../lib/supabase";

export default function UploadPage() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [caption, setCaption] = useState("");
  const [music, setMusic] = useState("原创音乐 · 星流");
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!supabase) return;
      const { data } = await supabase.auth.getSession();
      if (active) setUserId(data.session?.user.id ?? null);
    })();
    return () => { active = false; };
  }, []);

  function chooseFile(e: ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setError("");
    if (!selected.type.startsWith("video/")) {
      setError("请选择视频文件");
      return;
    }
    if (selected.size > 100 * 1024 * 1024) {
      setError("视频不能超过 100MB");
      return;
    }
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  }

  async function publish() {
    if (!supabase || !userId) {
      setError("请先登录星流账号");
      return;
    }
    if (!file) {
      setError("请先选择一个视频");
      return;
    }
    if (!caption.trim()) {
      setError("写一句作品描述吧");
      return;
    }

    setPublishing(true);
    setError("");
    const ext = file.name.split(".").pop()?.toLowerCase() || "mp4";
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage.from("videos").upload(path, file, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: false,
    });

    if (uploadError) {
      setPublishing(false);
      setError(`上传失败：${uploadError.message}`);
      return;
    }

    const { data: publicData } = supabase.storage.from("videos").getPublicUrl(path);
    const { error: insertError } = await supabase.from("videos").insert({
      user_id: userId,
      video_url: publicData.publicUrl,
      caption: caption.trim(),
      music: music.trim() || "原创音乐 · 星流",
    });

    if (insertError) {
      await supabase.storage.from("videos").remove([path]);
      setPublishing(false);
      setError(`发布失败：${insertError.message}`);
      return;
    }

    setDone(true);
    setPublishing(false);
    setTimeout(() => { window.location.href = "/"; }, 900);
  }

  if (!userId && !done) {
    return <main className="uploadPage"><div className="uploadEmpty"><Video size={48}/><h2>登录后发布作品</h2><p>登录星流，分享你的精彩瞬间</p><button onClick={() => window.location.href = "/auth"}>去登录</button></div></main>;
  }

  return <main className="uploadPage">
    <header className="uploadHeader"><button onClick={() => window.history.back()}><ArrowLeft/></button><b>发布作品</b><button className="draft">草稿</button></header>
    <div className="uploadBody">
      <div className={`videoPicker ${file ? "hasVideo" : ""}`} onClick={() => !file && inputRef.current?.click()}>
        {preview ? <><video src={preview} controls playsInline /><button className="removeVideo" onClick={(e) => { e.stopPropagation(); setFile(null); setPreview(""); }}><X size={18}/></button></> : <div className="pickerContent"><Video size={42}/><strong>选择视频</strong><span>支持 MP4、MOV、WebM，最大 100MB</span></div>}
      </div>
      <input ref={inputRef} hidden type="file" accept="video/*" onChange={chooseFile}/>
      <textarea value={caption} onChange={e => setCaption(e.target.value.slice(0, 500))} placeholder="分享这一刻……" maxLength={500}/>
      <div className="counter">{caption.length}/500</div>
      <div className="musicInput"><Music2 size={20}/><input value={music} onChange={e => setMusic(e.target.value)} placeholder="添加音乐"/><span>›</span></div>
      <div className="publishTip"><Check size={18}/><span>公开发布 · 任何人都可以看到</span></div>
      {error && <div className="uploadError">{error}</div>}
      <button className="publishBtn" disabled={publishing || !file} onClick={publish}>{publishing ? <><Loader2 className="spin" size={20}/>正在发布…</> : done ? <><Check size={20}/>发布成功</> : "发布"}</button>
    </div>
  </main>;
}

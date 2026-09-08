"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, Loader2, Music2, Video, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

const MAX_SIZE = 100 * 1024 * 1024;

export default function UploadPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [title, setTitle] = useState("");
  const [music, setMusic] = useState("原创音乐 · 星流");
  const [publishing, setPublishing] = useState(false);
  const [progress, setProgress] = useState(0);
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

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  function chooseFile(e: ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setError("");
    if (!selected.type.startsWith("video/")) return setError("请选择视频文件");
    if (selected.size > MAX_SIZE) return setError("视频不能超过 100MB");
    if (preview) URL.revokeObjectURL(preview);
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
    setProgress(0);
  }

  function clearFile(e?: React.MouseEvent) {
    e?.stopPropagation();
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview("");
    if (inputRef.current) inputRef.current.value = "";
  }

  async function publish() {
    if (!supabase || !userId) return setError("请先登录星流账号");
    if (!file) return setError("请先选择一个视频");
    if (!title.trim()) return setError("给作品写一个标题吧");

    setPublishing(true);
    setError("");
    setProgress(8);

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

    setProgress(72);
    const { data: publicData } = supabase.storage.from("videos").getPublicUrl(path);
    const videoUrl = publicData.publicUrl;

    const { error: insertError } = await supabase.from("videos").insert({
      user_id: userId,
      url: videoUrl,
      title: title.trim(),
      music: music.trim() || "原创音乐 · 星流",
      status: "published",
    });

    if (insertError) {
      await supabase.storage.from("videos").remove([path]);
      setPublishing(false);
      setError(`发布失败：${insertError.message}`);
      return;
    }

    setProgress(100);
    setDone(true);
    setPublishing(false);
    window.setTimeout(() => router.replace("/"), 900);
  }

  if (!userId && !done) {
    return (
      <main className="uploadPage">
        <div className="uploadEmpty">
          <Video size={48} />
          <h2>登录后发布作品</h2>
          <p>登录星流，分享你的精彩瞬间</p>
          <button onClick={() => router.push("/auth")}>去登录</button>
        </div>
      </main>
    );
  }

  return (
    <main className="uploadPage">
      <header className="uploadHeader">
        <button onClick={() => router.back()} aria-label="返回"><ArrowLeft /></button>
        <b>发布作品</b>
        <button className="draft" onClick={() => router.push("/")}>取消</button>
      </header>

      <div className="uploadBody">
        <div className={`videoPicker ${file ? "hasVideo" : ""}`} onClick={() => !file && inputRef.current?.click()}>
          {preview ? (
            <>
              <video src={preview} controls playsInline />
              <button className="removeVideo" onClick={clearFile} aria-label="删除视频"><X size={18} /></button>
            </>
          ) : (
            <div className="pickerContent">
              <Video size={42} />
              <strong>选择视频</strong>
              <span>MP4、MOV、WebM · 最大 100MB</span>
            </div>
          )}
        </div>

        <input ref={inputRef} hidden type="file" accept="video/*" onChange={chooseFile} />

        <textarea value={title} onChange={e => setTitle(e.target.value.slice(0, 120))} placeholder="写下作品标题或介绍……" maxLength={120} />
        <div className="counter">{title.length}/120</div>

        <div className="musicInput">
          <Music2 size={20} />
          <input value={music} onChange={e => setMusic(e.target.value.slice(0, 80))} placeholder="添加音乐" />
          <span>›</span>
        </div>

        <div className="publishTip"><Check size={18} /><span>公开发布 · 任何人都可以看到</span></div>

        {publishing && (
          <div className="uploadProgress">
            <div><span>正在上传作品</span><b>{progress}%</b></div>
            <div className="progressTrack"><i style={{ width: `${progress}%` }} /></div>
          </div>
        )}

        {error && <div className="uploadError">{error}</div>}

        <button className="publishBtn" disabled={publishing || !file || !title.trim()} onClick={publish}>
          {publishing ? <><Loader2 className="spin" size={20} />正在发布…</> : done ? <><Check size={20} />发布成功</> : "发布"}
        </button>
      </div>
    </main>
  );
}

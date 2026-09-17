"use client";

import { ChangeEvent, PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, ChevronDown, Clock3, Flashlight, Loader2, Music2, RotateCcw, Sparkles, SwitchCamera, Upload, Video, X, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

const MAX_SIZE = 200 * 1024 * 1024;
const MUSIC = ["原创音乐 · 星流", "夜行 · 星流", "夏日心动", "城市霓虹", "热浪节拍", "轻快日常"];
const FILTERS = [
  { name: "原图", value: "none" },
  { name: "清透", value: "brightness(1.08) saturate(1.08) contrast(1.02)" },
  { name: "奶油", value: "brightness(1.10) saturate(.82) sepia(.08) contrast(.96)" },
  { name: "冷调", value: "saturate(.92) hue-rotate(10deg) contrast(1.05)" },
  { name: "电影", value: "contrast(1.16) saturate(.82) brightness(.98)" },
  { name: "复古", value: "sepia(.24) saturate(.90) contrast(1.08)" },
  { name: "晨雾", value: "brightness(1.06) contrast(.94) saturate(.86) blur(.1px)" },
  { name: "夜景", value: "brightness(.90) contrast(1.16) saturate(1.08)" },
];
const SPEEDS = [0.3, 0.5, 1, 2, 3];
const COUNTDOWNS = [0, 3, 5, 10];
const DURATIONS = [15, 60, 180];

type Tool = "beauty" | "speed" | "timer" | "music" | "duration" | null;

async function coverFromVideo(url: string, filter: string) {
  return new Promise<Blob | null>(resolve => {
    const v = document.createElement("video");
    v.src = url; v.muted = true; v.playsInline = true; v.preload = "metadata";
    v.onloadedmetadata = () => { v.currentTime = Math.min(.5, Math.max(0, v.duration || 0)); };
    v.onseeked = () => {
      const c = document.createElement("canvas"); c.width = 720; c.height = 1280;
      const x = c.getContext("2d"); if (!x) return resolve(null);
      const w = v.videoWidth || 720, h = v.videoHeight || 1280, s = Math.max(720 / w, 1280 / h);
      x.fillStyle = "#000"; x.fillRect(0, 0, 720, 1280); x.filter = filter;
      x.drawImage(v, (720 - w * s) / 2, (1280 - h * s) / 2, w * s, h * s);
      c.toBlob(resolve, "image/jpeg", .9);
    };
    v.onerror = () => resolve(null);
  });
}

export default function StudioV4() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewRef = useRef<HTMLVideoElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordStreamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [uid, setUid] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [title, setTitle] = useState("");
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [filter, setFilter] = useState(0);
  const [beauty, setBeauty] = useState(true);
  const [beautyLevel, setBeautyLevel] = useState(45);
  const [speed, setSpeed] = useState(1);
  const [countdown, setCountdown] = useState(0);
  const [countdownLeft, setCountdownLeft] = useState(0);
  const [duration, setDuration] = useState(60);
  const [seconds, setSeconds] = useState(0);
  const [recording, setRecording] = useState(false);
  const [flash, setFlash] = useState(false);
  const [tool, setTool] = useState<Tool>(null);
  const [music, setMusic] = useState(MUSIC[0]);
  const [musicOpen, setMusicOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const activeFilter = FILTERS[filter]?.value || "none";
  const liveFilter = useMemo(() => `${activeFilter} brightness(${1 + beautyLevel / 1200}) saturate(${1 + beautyLevel / 1500})${beauty ? ` blur(${Math.min(1, .08 + beautyLevel / 150 * .9)}px)` : ""}`, [activeFilter, beauty, beautyLevel]);

  useEffect(() => {
    (async () => {
      if (!supabase) return;
      const { data } = await supabase.auth.getSession();
      if (!data.session) { router.replace("/auth"); return; }
      setUid(data.session.user.id);
      const saved = localStorage.getItem("xingliu-draft-title");
      if (saved) setTitle(saved);
    })();
  }, [router]);

  useEffect(() => { if (title) localStorage.setItem("xingliu-draft-title", title); }, [title]);

  const stopCamera = () => { cameraRef.current?.getTracks().forEach(t => t.stop()); cameraRef.current = null; };
  const clearTimers = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current); rafRef.current = null;
    if (timerRef.current) clearInterval(timerRef.current); timerRef.current = null;
    if (countdownRef.current) clearInterval(countdownRef.current); countdownRef.current = null;
  };

  useEffect(() => () => { stopCamera(); recordStreamRef.current?.getTracks().forEach(t => t.stop()); clearTimers(); }, []);

  async function startCamera(next: "user" | "environment" = facing) {
    setError("");
    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: next }, width: { ideal: 1080 }, height: { ideal: 1920 }, frameRate: { ideal: 30, max: 30 } },
        audio: true,
      });
      cameraRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      setFlash(false);
    } catch { setError("无法启动相机，请允许摄像头和麦克风权限。也可以从相册选择视频。"); }
  }

  useEffect(() => { if (!file && navigator.mediaDevices?.getUserMedia) void startCamera(facing); }, [facing, file]);

  function choose(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    if (!f.type.startsWith("video/")) return setError("请选择视频文件");
    if (f.size > MAX_SIZE) return setError("视频不能超过 200MB");
    stopCamera(); clearTimers();
    if (preview) URL.revokeObjectURL(preview);
    setFile(f); setPreview(URL.createObjectURL(f)); setError("");
  }

  async function toggleFlash() {
    const track = cameraRef.current?.getVideoTracks()[0];
    if (!track) return setError("相机还没有准备好");
    const caps = track.getCapabilities?.() as MediaTrackCapabilities & { torch?: boolean };
    if (!caps.torch) return setError("当前设备/浏览器不支持闪光灯控制");
    try { await track.applyConstraints({ advanced: [{ torch: !flash } as MediaTrackConstraintSet] }); setFlash(v => !v); }
    catch { setError("闪光灯暂时不可用"); }
  }

  function mime() {
    const types = ["video/mp4;codecs=h264,aac", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
    return types.find(t => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t)) || "";
  }

  function drawFrame(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, video: HTMLVideoElement) {
    const w = video.videoWidth || 720, h = video.videoHeight || 1280, scale = Math.max(canvas.width / w, canvas.height / h);
    const dw = w * scale, dh = h * scale;
    ctx.save(); ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.fillStyle = "#000"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.filter = liveFilter;
    if (facing === "user") { ctx.translate(canvas.width, 0); ctx.scale(-1, 1); }
    ctx.drawImage(video, (canvas.width - dw) / 2, (canvas.height - dh) / 2, dw, dh); ctx.restore();
  }

  function startRecorder() {
    const cam = cameraRef.current, source = videoRef.current, type = mime();
    if (!cam || !source) return setError("相机还没有准备好");
    if (!type) return setError("当前 Safari 不支持特效录制，请更新系统或使用相册");
    try {
      const canvas = document.createElement("canvas"); canvas.width = 720; canvas.height = 1280; canvasRef.current = canvas;
      const ctx = canvas.getContext("2d", { alpha: false }); if (!ctx) return setError("特效引擎启动失败");
      const loop = () => { if (!canvasRef.current || !videoRef.current) return; drawFrame(ctx, canvas, videoRef.current); rafRef.current = requestAnimationFrame(loop); };
      loop();
      const output = canvas.captureStream(30); cam.getAudioTracks().forEach(t => output.addTrack(t)); recordStreamRef.current = output;
      const chunks: Blob[] = []; const rec = new MediaRecorder(output, { mimeType: type });
      rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
      rec.onerror = () => setError("录制失败，请重试");
      rec.onstop = () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current); rafRef.current = null;
        output.getTracks().forEach(t => t.stop()); recordStreamRef.current = null;
        const blob = new Blob(chunks, { type }); const ext = type.includes("mp4") ? "mp4" : "webm";
        const f = new File([blob], `xingliu-${Date.now()}.${ext}`, { type });
        if (preview) URL.revokeObjectURL(preview);
        setFile(f); setPreview(URL.createObjectURL(blob)); stopCamera(); setRecording(false);
      };
      recorderRef.current = rec; rec.start(250); setRecording(true); setSeconds(0);
      timerRef.current = setInterval(() => setSeconds(s => {
        const next = s + 1;
        if (next >= duration) { rec.stop(); return duration; }
        return next;
      }), 1000);
    } catch { setError("当前浏览器无法启动录制"); }
  }

  function startRecording() {
    if (recording) return;
    if (!countdown) return startRecorder();
    setCountdownLeft(countdown); let left = countdown;
    countdownRef.current = setInterval(() => { left -= 1; setCountdownLeft(left); if (left <= 0) { clearTimers(); startRecorder(); } }, 1000);
  }

  function stopRecording() {
    if (recorderRef.current && recorderRef.current.state !== "inactive") recorderRef.current.stop();
    recorderRef.current = null; setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current); timerRef.current = null;
  }

  function reset() {
    stopRecording(); stopCamera(); clearTimers();
    if (preview) URL.revokeObjectURL(preview);
    setFile(null); setPreview(""); setDone(false); setSeconds(0); setError("");
    if (inputRef.current) inputRef.current.value = "";
  }

  async function publish() {
    if (!supabase || !uid || !file) return setError("请先拍摄或选择视频");
    if (!title.trim()) return setError("写一句作品文案再发布");
    setPublishing(true); setError(""); setProgress(5);
    const id = crypto.randomUUID(); const ext = file.name.split(".").pop()?.toLowerCase() || "mp4"; const path = `${uid}/${id}.${ext}`;
    const up = await supabase.storage.from("videos").upload(path, file, { contentType: file.type, cacheControl: "3600", upsert: false });
    if (up.error) { setPublishing(false); return setError(`视频上传失败：${up.error.message}`); }
    setProgress(58); const videoUrl = supabase.storage.from("videos").getPublicUrl(path).data.publicUrl;
    let coverUrl: string | null = null;
    try {
      const cover = await coverFromVideo(preview, activeFilter);
      if (cover) { const cp = `${uid}/covers/${id}.jpg`; const cu = await supabase.storage.from("videos").upload(cp, cover, { contentType: "image/jpeg", cacheControl: "86400" }); if (!cu.error) coverUrl = supabase.storage.from("videos").getPublicUrl(cp).data.publicUrl; }
    } catch {}
    setProgress(82);
    const db = await supabase.from("videos").insert({ user_id: uid, url: videoUrl, title: title.trim(), music, status: "published", ...(coverUrl ? { cover_url: coverUrl } : {}) });
    if (db.error) { await supabase.storage.from("videos").remove([path]); setPublishing(false); return setError(`发布失败：${db.error.message}`); }
    localStorage.removeItem("xingliu-draft-title"); setProgress(100); setDone(true); setPublishing(false);
    setTimeout(() => { router.refresh(); router.replace("/"); }, 650);
  }

  function toolButton(next: Tool) { setTool(tool === next ? null : next); setMusicOpen(false); }
  function onShutterPointerDown(_e: PointerEvent<HTMLButtonElement>) { if (recording) stopRecording(); }

  if (!uid && !done) return <main className="empty"><Video size={48}/><h2>登录后发布作品</h2><p>登录星流，开始创作</p><button onClick={() => router.push("/auth")}>去登录</button></main>;

  return <main className="studio">
    <style jsx global>{`
      *{box-sizing:border-box}.studio,.empty{min-height:100dvh;background:#050505;color:#fff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif}.stage{height:100dvh;position:relative;overflow:hidden;background:#090909}.stage video{width:100%;height:100%;object-fit:cover;transform:${facing === "user" ? "scaleX(-1)" : "none"};filter:${liveFilter}}.top{position:absolute;inset:0 0 auto;height:78px;padding:12px 15px;display:flex;align-items:center;justify-content:space-between;z-index:10;background:linear-gradient(#000c,transparent)}.round{width:42px;height:42px;border:1px solid #ffffff28;background:#0009;color:#fff;border-radius:50%;display:grid;place-items:center}.top b{font-size:16px}.top .mode{font-size:11px;color:#bbb}.tools{position:absolute;right:14px;top:98px;z-index:8;display:grid;gap:10px}.tool{width:46px;height:46px;border:1px solid #ffffff20;background:#090909b8;color:#fff;border-radius:50%;display:grid;place-items:center;backdrop-filter:blur(10px)}.tool.active{background:#fff;color:#000}.badge{position:absolute;left:14px;top:96px;z-index:7;padding:7px 11px;border-radius:999px;background:#0008;border:1px solid #ffffff20;font-size:11px}.panel{position:absolute;right:68px;top:96px;width:240px;z-index:9;padding:15px;border-radius:18px;background:#111111ed;border:1px solid #ffffff18;box-shadow:0 20px 70px #000b;backdrop-filter:blur(20px)}.label{font-size:11px;color:#999;margin-bottom:9px}.chips{display:flex;gap:7px;flex-wrap:wrap}.chip{border:1px solid #333;background:#191919;color:#ddd;border-radius:999px;padding:7px 10px;font-size:11px}.chip.on{background:#fff;color:#000;border-color:#fff}.range{width:100%;accent-color:#fff}.beautyRow{display:flex;justify-content:space-between;font-size:12px;color:#ddd;margin:12px 0 7px}.filters{position:absolute;left:12px;right:12px;bottom:198px;z-index:7;display:flex;gap:8px;overflow:auto;padding:5px 0}.filters button{min-width:60px;border:1px solid #ffffff30;background:#0009;color:#fff;border-radius:11px;padding:9px 6px;font-size:10px}.filters .on{background:#fff;color:#000;border-color:#fff}.progressTrack{position:absolute;left:0;right:0;bottom:181px;height:3px;background:#ffffff25;z-index:8}.progressTrack i{display:block;height:100%;background:#fff}.countdown{position:absolute;inset:0;z-index:20;display:grid;place-items:center;font-size:110px;font-weight:900;text-shadow:0 5px 30px #000}.bottom{position:absolute;left:0;right:0;bottom:0;z-index:7;padding:16px 18px 28px;background:linear-gradient(transparent,#000d 34%,#000)}.modes{display:flex;justify-content:center;gap:32px;margin-bottom:15px}.modes button{background:none;border:0;color:#888;font-weight:500}.modes .on{color:#fff;font-weight:800}.captureRow{display:flex;align-items:center;justify-content:center;gap:42px}.capture{width:84px;height:84px;border:4px solid #fff;border-radius:50%;background:#fff;box-shadow:0 0 0 5px #0005;touch-action:none}.capture.rec{background:#ff3150}.capture.rec:after{content:"";display:block;width:28px;height:28px;border-radius:7px;background:#fff;margin:auto}.time{text-align:center;font-size:13px;margin-bottom:8px;font-variant-numeric:tabular-nums}.hint{text-align:center;color:#999;font-size:10px;margin-top:11px}.edit{min-height:100dvh;background:#070707;padding-bottom:40px}.head{height:60px;border-bottom:1px solid #222;display:flex;align-items:center;justify-content:space-between;padding:0 16px;position:sticky;top:0;background:#070707f5;z-index:5}.head button{background:none;border:0;color:#fff;display:flex;align-items:center;gap:4px}.content{max-width:640px;margin:auto;padding:16px}.preview{height:56dvh;max-height:700px;background:#000;border-radius:18px;overflow:hidden;position:relative}.preview video{width:100%;height:100%;object-fit:contain}.remove{position:absolute;right:10px;top:10px;width:36px;height:36px;border:0;border-radius:50%;background:#000b;color:#fff}.editBar{display:flex;gap:8px;overflow:auto;padding:12px 0}.editBar button{white-space:nowrap;border:1px solid #333;background:#111;color:#ddd;border-radius:11px;padding:9px 12px}.editBar .on{background:#fff;color:#000}.music{position:relative;margin-top:2px}.musicBtn{width:100%;height:50px;background:#111;border:1px solid #292929;border-radius:13px;color:#fff;display:flex;align-items:center;gap:10px;padding:0 13px}.musicBtn span{flex:1;text-align:left}.musicList{position:absolute;left:0;right:0;bottom:58px;background:#161616;border:1px solid #333;border-radius:14px;padding:6px;z-index:10}.musicList button{display:block;width:100%;padding:11px;border:0;background:none;color:#fff;text-align:left;border-radius:8px}.content textarea{width:100%;min-height:110px;margin-top:12px;background:#111;border:1px solid #292929;border-radius:13px;color:#fff;padding:13px;font-size:15px;resize:none;outline:none}.counter{text-align:right;color:#666;font-size:11px;margin-top:5px}.tip{color:#888;font-size:12px;margin:13px 2px}.progress{height:5px;background:#222;border-radius:9px;overflow:hidden;margin:12px 0}.progress i{display:block;height:100%;background:#fff;transition:width .2s}.error{color:#ff7474;font-size:13px;margin:10px 2px}.publish{width:100%;height:52px;border:0;border-radius:13px;background:#fff;color:#000;font-weight:800;display:flex;align-items:center;justify-content:center;gap:8px}.publish:disabled{opacity:.4}.empty{display:grid;place-items:center;align-content:center;text-align:center;padding:30px;color:#999}.empty h2{color:#fff}.empty button{border:0;background:#fff;color:#000;border-radius:12px;padding:12px 30px;font-weight:800;margin-top:12px}.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
    `}</style>

    {!file ? <section className="stage">
      <video ref={videoRef} playsInline muted />
      {countdownLeft > 0 && <div className="countdown">{countdownLeft}</div>}
      <div className="badge">✨ {beauty ? `美颜 ${beautyLevel}%` : "美颜关闭"} · {FILTERS[filter].name}</div>
      <header className="top"><button className="round" onClick={() => router.back()}><ArrowLeft size={21}/></button><div><b>星流 · Studio V4</b><div className="mode">1080P · 30FPS</div></div><button className="round" onClick={() => inputRef.current?.click()}><Upload size={19}/></button></header>
      <div className="tools">
        <button className={`tool ${tool === "beauty" ? "active" : ""}`} onClick={() => toolButton("beauty")}><Sparkles size={19}/></button>
        <button className={`tool ${flash ? "active" : ""}`} onClick={toggleFlash}><Flashlight size={19}/></button>
        <button className={`tool ${tool === "timer" ? "active" : ""}`} onClick={() => toolButton("timer")}><Clock3 size={19}/></button>
        <button className={`tool ${tool === "speed" ? "active" : ""}`} onClick={() => toolButton("speed")}><Zap size={19}/></button>
        <button className={`tool ${tool === "duration" ? "active" : ""}`} onClick={() => toolButton("duration")}><RotateCcw size={19}/></button>
      </div>
      {tool === "beauty" && <div className="panel"><div className="label">自然美颜</div><div className="beautyRow"><span>轻柔</span><b>{beautyLevel}%</b><span>明显</span></div><input className="range" type="range" min="0" max="100" value={beautyLevel} onChange={e => setBeautyLevel(Number(e.target.value))}/><div className="chips" style={{marginTop:12}}><button className={`chip ${beauty ? "on" : ""}`} onClick={() => setBeauty(v => !v)}>{beauty ? "美颜开启" : "美颜关闭"}</button></div></div>}
      {tool === "speed" && <div className="panel"><div className="label">拍摄速度</div><div className="chips">{SPEEDS.map(v => <button key={v} className={`chip ${speed === v ? "on" : ""}`} onClick={() => {setSpeed(v); if (videoRef.current) videoRef.current.playbackRate = v;}}>{v}x</button>)}</div><div className="label" style={{marginTop:12}}>拍摄预览会按所选速度播放。</div></div>}
      {tool === "timer" && <div className="panel"><div className="label">倒计时拍摄</div><div className="chips">{COUNTDOWNS.map(v => <button key={v} className={`chip ${countdown === v ? "on" : ""}`} onClick={() => {setCountdown(v);setTool(null)}}>{v ? `${v}秒` : "关闭"}</button>)}</div></div>}
      {tool === "duration" && <div className="panel"><div className="label">单段最长时长</div><div className="chips">{DURATIONS.map(v => <button key={v} className={`chip ${duration === v ? "on" : ""}`} onClick={() => {setDuration(v);setTool(null)}}>{v === 180 ? "3分钟" : `${v}秒`}</button>)}</div></div>}
      <div className="filters">{FILTERS.map((f,i)=><button key={f.name} className={filter===i?"on":""} onClick={()=>setFilter(i)}>{f.name}</button>)}</div>
      {recording && <div className="progressTrack"><i style={{width:`${Math.min(100, seconds / duration * 100)}%`}}/></div>}
      <div className="bottom">
        {recording && <div className="time">{String(Math.floor(seconds/60)).padStart(2,"0")}:{String(seconds%60).padStart(2,"0")} / {String(Math.floor(duration/60)).padStart(2,"0")}:{String(duration%60).padStart(2,"0")}</div>}
        <div className="modes"><button className="on">拍摄</button><button onClick={()=>inputRef.current?.click()}>相册</button></div>
        <div className="captureRow"><button className="round" onClick={()=>inputRef.current?.click()}><Upload size={19}/></button><button className={`capture ${recording?"rec":""}`} onPointerDown={onShutterPointerDown} onClick={recording ? undefined : startRecording} aria-label={recording?"停止录制":"开始录制"}/><button className="round" onClick={()=>!recording&&setFacing(v=>v === "user" ? "environment" : "user")}><SwitchCamera size={20}/></button></div>
        <div className="hint">美颜与滤镜会写入相机拍摄的视频 · 最长 {duration === 180 ? "3 分钟" : `${duration} 秒`}</div>
      </div>
      <input ref={inputRef} hidden type="file" accept="video/*" onChange={choose}/>
    </section> : <section className="edit">
      <header className="head"><button onClick={reset}><ArrowLeft size={18}/>重拍</button><b>发布作品</b><button onClick={()=>router.push("/")}><X size={18}/>取消</button></header>
      <div className="content">
        <div className="preview"><video ref={previewRef} src={preview} controls playsInline style={{filter:activeFilter}} onLoadedMetadata={()=>{if(previewRef.current) previewRef.current.playbackRate=speed}}/><button className="remove" onClick={reset}><X size={18}/></button></div>
        <div className="editBar">{FILTERS.map((f,i)=><button key={f.name} className={filter===i?"on":""} onClick={()=>setFilter(i)}>{f.name}</button>)}{SPEEDS.map(v=><button key={v} className={speed===v?"on":""} onClick={()=>{setSpeed(v);if(previewRef.current)previewRef.current.playbackRate=v}}>{v}x</button>)}</div>
        <div className="music"><button className="musicBtn" onClick={()=>{setMusicOpen(v=>!v);setTool(null)}}><Music2 size={19}/><span>{music}</span><ChevronDown size={17}/></button>{musicOpen&&<div className="musicList">{MUSIC.map(m=><button key={m} onClick={()=>{setMusic(m);setMusicOpen(false)}}>{m}</button>)}</div>}</div>
        <textarea value={title} maxLength={120} onChange={e=>setTitle(e.target.value)} placeholder="说点什么……添加作品文案"/><div className="counter">{title.length}/120</div>
        <div className="tip">公开发布 · 相机拍摄的美颜和滤镜已经写入视频。音乐目前作为作品配乐信息保存。</div>
        {publishing&&<div className="progress"><i style={{width:`${progress}%`}}/></div>}{error&&<div className="error">{error}</div>}
        <button className="publish" disabled={publishing||!title.trim()} onClick={publish}>{publishing?<><Loader2 size={19} className="spin"/>正在发布 {progress}%</>:done?<><Check size={19}/>发布成功</>:"发布到星流"}</button>
      </div>
    </section>}
  </main>;
}

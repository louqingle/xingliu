"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, Clock3, Flashlight, Image as ImageIcon, Music2, RotateCcw, Settings2, Sparkles, SwitchCamera } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

const FILTERS = [
  ["原图", "none"], ["清透", "brightness(1.08) saturate(1.08) contrast(1.02)"],
  ["奶油", "brightness(1.10) saturate(.82) sepia(.08) contrast(.96)"], ["冷调", "saturate(.92) hue-rotate(10deg) contrast(1.05)"],
  ["电影", "contrast(1.16) saturate(.82) brightness(.98)"], ["复古", "sepia(.24) saturate(.90) contrast(1.08)"],
];
const RATIOS = [
  { key: "9:16", w: 9, h: 16 }, { key: "3:4", w: 3, h: 4 }, { key: "1:1", w: 1, h: 1 }, { key: "4:3", w: 4, h: 3 }, { key: "16:9", w: 16, h: 9 },
];
const TOOLS = [
  ["flip", "翻转"], ["flash", "闪光灯"], ["settings", "设置"], ["count", "倒计时"], ["beauty", "美颜"],
] as const;

type Mode = "photo" | "video" | "segment";
type Ratio = typeof RATIOS[number]["key"];

export default function StudioV5() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [uid, setUid] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("video");
  const [ratio, setRatio] = useState<Ratio>("9:16");
  const [ratioOpen, setRatioOpen] = useState(false);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [filter, setFilter] = useState(0);
  const [beauty, setBeauty] = useState(45);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [countLeft, setCountLeft] = useState(0);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [result, setResult] = useState("");
  const [resultType, setResultType] = useState<"video" | "image">("video");
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");

  const filterValue = FILTERS[filter][1];
  const liveFilter = `${filterValue} brightness(${1 + beauty / 1200}) saturate(${1 + beauty / 1500})`;
  const ratioData = RATIOS.find(r => r.key === ratio) || RATIOS[0];

  useEffect(() => {
    (async () => {
      const session = supabase ? (await supabase.auth.getSession()).data.session : null;
      if (!session) { router.replace("/auth"); return; }
      setUid(session.user.id);
    })();
  }, [router]);

  async function startCamera(next = facing) {
    try {
      streamRef.current?.getTracks().forEach(t => t.stop());
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: next }, width: { ideal: 1080 }, height: { ideal: 1920 }, frameRate: { ideal: 30, max: 30 } }, audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      setError("");
    } catch { setError("请允许星流使用摄像头和麦克风"); }
  }

  useEffect(() => {
    if (navigator.mediaDevices?.getUserMedia && uid) void startCamera();
    return () => streamRef.current?.getTracks().forEach(t => t.stop());
  }, [uid]);

  async function switchCamera() {
    const next = facing === "user" ? "environment" : "user";
    setFacing(next); await startCamera(next);
  }

  async function toggleFlash() {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    const caps = track.getCapabilities?.() as MediaTrackCapabilities & { torch?: boolean };
    if (!caps.torch) return setError("当前设备不支持闪光灯控制");
    try { await track.applyConstraints({ advanced: [{ torch: !flash } as MediaTrackConstraintSet] }); setFlash(v => !v); } catch { setError("闪光灯暂时不可用"); }
  }

  function dims() {
    const r = RATIOS.find(x => x.key === ratio) || RATIOS[0];
    const base = 720;
    return r.w >= r.h ? [base, Math.round(base * r.h / r.w)] : [Math.round(base * r.w / r.h), base];
  }

  function drawToCanvas(v: HTMLVideoElement, ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, w, h); ctx.filter = liveFilter;
    const scale = Math.min(w / (v.videoWidth || w), h / (v.videoHeight || h));
    const dw = (v.videoWidth || w) * scale, dh = (v.videoHeight || h) * scale;
    ctx.save();
    if (facing === "user") { ctx.translate(w, 0); ctx.scale(-1, 1); }
    ctx.drawImage(v, (w - dw) / 2, (h - dh) / 2, dw, dh);
    ctx.restore();
  }

  function takePhoto() {
    const v = videoRef.current; if (!v) return;
    const [w, h] = dims(); const c = document.createElement("canvas"); c.width = w; c.height = h;
    const ctx = c.getContext("2d"); if (!ctx) return;
    drawToCanvas(v, ctx, w, h);
    setResult(c.toDataURL("image/jpeg", .92)); setResultType("image");
    streamRef.current?.getTracks().forEach(t => t.stop());
  }

  function startVideo() {
    const v = videoRef.current; if (!v || recording) return;
    const type = ["video/mp4;codecs=h264,aac", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm"].find(t => MediaRecorder.isTypeSupported(t));
    if (!type) return setError("当前浏览器不支持视频录制");
    const [w, h] = dims(); const canvas = document.createElement("canvas"); canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    let keepDrawing = true;
    const draw = () => {
      if (!keepDrawing) return;
      drawToCanvas(v, ctx, w, h);
      requestAnimationFrame(draw);
    };
    draw();
    const out = canvas.captureStream(30);
    streamRef.current?.getAudioTracks().forEach(t => out.addTrack(t));
    const rec = new MediaRecorder(out, { mimeType: type });
    chunksRef.current = [];
    rec.ondataavailable = e => e.data.size && chunksRef.current.push(e.data);
    rec.onstop = () => {
      keepDrawing = false;
      const blob = new Blob(chunksRef.current, { type });
      setResult(URL.createObjectURL(blob)); setResultType("video"); setRecording(false);
      streamRef.current?.getTracks().forEach(t => t.stop()); out.getTracks().forEach(t => t.stop());
    };
    recorderRef.current = rec; rec.start(250); setRecording(true); setSeconds(0);
    const started = Date.now();
    const tick = () => {
      if (recorderRef.current === rec && rec.state === "recording") {
        setSeconds(Math.floor((Date.now() - started) / 1000)); requestAnimationFrame(tick);
      }
    };
    tick();
  }

  function shutter() {
    if (recording) { recorderRef.current?.stop(); recorderRef.current = null; return; }
    if (mode === "photo") return takePhoto();
    if (countdown > 0) {
      setCountLeft(countdown); let n = countdown;
      const id = setInterval(() => { n--; setCountLeft(n); if (n <= 0) { clearInterval(id); setCountLeft(0); startVideo(); } }, 1000);
      return;
    }
    startVideo();
  }

  async function publish() {
    if (!supabase || !uid || !result) return;
    try {
      const res = await fetch(result); const blob = await res.blob();
      const ext = resultType === "image" ? "jpg" : (blob.type.includes("mp4") ? "mp4" : "webm");
      const id = crypto.randomUUID(); const path = `${uid}/${id}.${ext}`;
      const up = await supabase.storage.from("videos").upload(path, blob, { contentType: blob.type, upsert: false });
      if (up.error) throw up.error;
      const url = supabase.storage.from("videos").getPublicUrl(path).data.publicUrl;
      const db = await supabase.from("videos").insert({ user_id: uid, url, title: title.trim() || "", status: "published" });
      if (db.error) throw db.error;
      router.replace("/");
    } catch (e) { setError(`发布失败：${e instanceof Error ? e.message : "请重试"}`); }
  }

  if (!uid) return <main className="loading">正在打开相机…</main>;

  return <main className="cameraApp">
    <style jsx global>{`
      html,body{margin:0!important;background:#000!important;overflow:hidden!important}.cameraApp{position:fixed;inset:0;background:#000;color:#fff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC",sans-serif;overflow:hidden}.cameraStage{position:absolute;inset:0;display:grid;place-items:center;background:#050505}.frame{position:relative;width:min(100vw,calc(100dvh * ${ratioData.w}/${ratioData.h}));height:min(100dvh,calc(100vw * ${ratioData.h}/${ratioData.w}));max-width:100vw;max-height:100dvh;overflow:hidden;background:#111}.frame video{width:100%;height:100%;object-fit:contain;background:#000;display:block;filter:${liveFilter};transform:${facing === "user" ? "scaleX(-1)" : "none"}}.topbar{position:absolute;left:0;right:0;top:0;height:100px;padding:max(14px,env(safe-area-inset-top)) 18px 0;display:flex;align-items:flex-start;justify-content:space-between;z-index:10;background:linear-gradient(#000b,transparent)}.circle{width:46px;height:46px;border-radius:50%;border:0;background:#0008;color:#fff;display:grid;place-items:center}.musicBtn{margin-top:10px;background:#333e;border:0;border-radius:17px;color:#fff;padding:14px 22px;font-size:17px;font-weight:800;backdrop-filter:blur(12px)}.side{position:absolute;right:14px;top:145px;z-index:11;display:flex;flex-direction:column;gap:17px;align-items:center}.side button{background:none;border:0;color:#fff;display:flex;flex-direction:column;align-items:center;gap:4px;font-weight:700;font-size:12px;text-shadow:0 2px 8px #000}.side .ico{width:48px;height:48px;border-radius:50%;display:grid;place-items:center;background:#0004}.side .ico.active{background:#fff;color:#000}.bottom{position:absolute;left:0;right:0;bottom:0;z-index:12;padding:0 18px max(24px,calc(24px + env(safe-area-inset-bottom)));background:linear-gradient(transparent,#000d 36%,#000)}.modes{display:flex;justify-content:center;gap:30px;align-items:center;margin-bottom:20px}.modes button{border:0;background:none;color:#fff;font-size:19px;font-weight:800;padding:9px 15px}.modes .on{background:#fff;color:#111;border-radius:24px}.captureRow{display:flex;align-items:center;justify-content:center;gap:70px}.capture{width:86px;height:86px;border-radius:50%;border:4px solid #fff;background:#fff;box-shadow:0 0 0 4px #0008}.capture.rec{background:#ff3355}.capture.rec:after{content:"";display:block;width:30px;height:30px;border-radius:6px;background:#fff;margin:auto}.mini{width:58px;height:58px;border-radius:14px;overflow:hidden;border:1px solid #ffffff55;background:#222;color:#fff;display:grid;place-items:center}.ratioBar{display:flex;justify-content:center;gap:7px;margin:14px auto 10px;overflow:auto;max-width:100%;padding:3px}.ratioBar button{border:1px solid #ffffff38;background:#0008;color:#fff;border-radius:999px;padding:7px 11px;font-size:12px}.ratioBar .on{background:#fff;color:#000;border-color:#fff}.panel{position:absolute;right:72px;top:150px;width:235px;background:#111e;border:1px solid #fff2;border-radius:18px;padding:15px;z-index:20;backdrop-filter:blur(20px)}.panelTitle{font-size:12px;color:#aaa;margin-bottom:10px}.panelRow{display:flex;gap:7px;flex-wrap:wrap}.chip{border:1px solid #333;background:#191919;color:#ddd;border-radius:999px;padding:8px 11px}.chip.on{background:#fff;color:#000}.range{width:100%}.result{position:absolute;inset:0;background:#000;z-index:30;display:flex;flex-direction:column}.resultMedia{flex:1;display:grid;place-items:center;min-height:0}.resultMedia video,.resultMedia img{max-width:100%;max-height:100%;object-fit:contain}.resultHead{height:64px;display:flex;align-items:center;justify-content:space-between;padding:0 16px}.publishBar{padding:14px 18px 28px}.publishBar input{width:100%;height:48px;border-radius:12px;border:1px solid #333;background:#151515;color:#fff;padding:0 14px;margin-bottom:10px}.publishBar button{width:100%;height:50px;border:0;border-radius:13px;background:#fff;color:#000;font-weight:800}.error{position:absolute;left:20px;right:20px;top:110px;z-index:40;text-align:center;background:#7b1f2b;color:#fff;border-radius:12px;padding:10px;font-size:12px}.count{position:absolute;inset:0;display:grid;place-items:center;z-index:50;font-size:120px;font-weight:900;text-shadow:0 4px 30px #000}.loading{min-height:100dvh;background:#000;color:#fff;display:grid;place-items:center}
    `}</style>

    <section className="cameraStage">
      <div className="frame"><video ref={videoRef} playsInline muted /></div>
      <div className="topbar">
        <button className="circle" onClick={() => router.back()}><X size={28}/></button>
        <button className="musicBtn"><Music2 size={18} style={{verticalAlign:"-3px",marginRight:7}}/>选择音乐</button>
        <button className="circle" onClick={() => setRatioOpen(v => !v)}><Settings2 size={22}/></button>
      </div>
      <div className="side">
        {TOOLS.map(([key,label]) => <button key={key} onClick={() => { if(key === "flip") void switchCamera(); else if(key === "flash") void toggleFlash(); else setActiveTool(activeTool === key ? null : key); }}><span className={`ico ${activeTool === key ? "active" : ""}`}>{key === "flip" ? <RotateCcw size={27}/> : key === "flash" ? <Flashlight size={27}/> : key === "settings" ? <Settings2 size={27}/> : key === "count" ? <Clock3 size={27}/> : <Sparkles size={27}/>}</span>{label}</button>)}
      </div>
      {activeTool === "count" && <div className="panel"><div className="panelTitle">倒计时拍摄</div><div className="panelRow">{[0,3,5,10].map(v=><button key={v} className={`chip ${countdown===v?"on":""}`} onClick={()=>{setCountdown(v);setActiveTool(null)}}>{v?`${v}秒`:"关闭"}</button>)}</div></div>}
      {activeTool === "beauty" && <div className="panel"><div className="panelTitle">美颜强度 · {beauty}%</div><input className="range" type="range" min="0" max="100" value={beauty} onChange={e=>setBeauty(Number(e.target.value))}/></div>}
      {ratioOpen && <div className="panel"><div className="panelTitle">画面比例 · 自由切换</div><div className="panelRow">{RATIOS.map(r=><button key={r.key} className={`chip ${ratio===r.key?"on":""}`} onClick={()=>{setRatio(r.key);setRatioOpen(false)}}>{r.key}</button>)}</div></div>}
      {countLeft>0 && <div className="count">{countLeft}</div>}
      {error && <div className="error">{error}</div>}
      <div className="bottom">
        <div className="ratioBar">{RATIOS.map(r=><button key={r.key} className={ratio===r.key?"on":""} onClick={()=>setRatio(r.key)}>{r.key}</button>)}</div>
        <div className="modes"><button className={mode==="segment"?"on":""} onClick={()=>setMode("segment")}>分段拍</button><button className={mode==="photo"?"on":""} onClick={()=>setMode("photo")}>照片</button><button className={mode==="video"?"on":""} onClick={()=>setMode("video")}>视频</button></div>
        <div className="captureRow"><button className="mini" onClick={()=>inputRef.current?.click()}><ImageIcon size={23}/></button><button className={`capture ${recording?"rec":""}`} onClick={shutter} aria-label="拍摄"/><button className="mini" onClick={switchCamera}><SwitchCamera size={23}/></button></div>
      </div>
      <input ref={inputRef} hidden type="file" accept="image/*,video/*" onChange={e=>{const f=e.target.files?.[0];if(f){setResult(URL.createObjectURL(f));setResultType(f.type.startsWith("image")?"image":"video");streamRef.current?.getTracks().forEach(t=>t.stop());}}}/>
    </section>

    {result && <section className="result"><header className="resultHead"><button className="circle" onClick={()=>{URL.revokeObjectURL(result);setResult("");void startCamera()}}><ArrowLeft size={22}/></button><b>预览作品</b><button className="circle" onClick={()=>{URL.revokeObjectURL(result);setResult("")}}><X size={21}/></button></header><div className="resultMedia">{resultType==="image"?<img src={result} alt="预览"/>:<video src={result} controls playsInline/>}</div><div className="publishBar"><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="说点什么……"/><button onClick={publish}><Check size={18} style={{verticalAlign:"-4px",marginRight:6}}/>发布到星流</button></div></section>}
  </main>;
}

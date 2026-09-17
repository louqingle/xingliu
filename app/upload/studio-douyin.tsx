"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Camera, Check, Clock3, Flashlight, Image as ImageIcon, MoreVertical, Music2, RotateCcw, Sparkles, SwitchCamera, Wand2, X, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

const FILTERS = [
  ["原图", "none"],
  ["清透", "brightness(1.08) saturate(1.08) contrast(1.02)"],
  ["奶油", "brightness(1.10) saturate(.84) sepia(.06) contrast(.97)"],
  ["电影", "contrast(1.14) saturate(.84) brightness(.99)"],
  ["冷调", "saturate(.92) hue-rotate(9deg) contrast(1.05)"],
  ["复古", "sepia(.20) saturate(.92) contrast(1.07)"],
] as const;
const DURATIONS = [15, 60, 180];
const SPEEDS = [0.5, 1, 2, 3];
const COUNTDOWNS = [0, 3, 5, 10];
type Mode = "segment" | "photo" | "video";
type Tool = "beauty" | "timer" | "speed" | "duration" | null;

export default function StudioDouyin() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const bgVideoRef = useRef<HTMLVideoElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordStreamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [uid, setUid] = useState<string | null>(null);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [mode, setMode] = useState<Mode>("photo");
  const [filter, setFilter] = useState(0);
  const [beauty, setBeauty] = useState(45);
  const [tool, setTool] = useState<Tool>(null);
  const [flash, setFlash] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [duration, setDuration] = useState(60);
  const [speed, setSpeed] = useState(1);
  const [countLeft, setCountLeft] = useState(0);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [result, setResult] = useState("");
  const [resultType, setResultType] = useState<"image" | "video">("video");
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");

  const filterValue = FILTERS[filter][1];
  const liveFilter = `${filterValue} brightness(${1 + beauty / 1800}) saturate(${1 + beauty / 2200})`;

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (!supabase) return;
        const { data, error: authError } = await supabase.auth.getSession();
        if (authError) throw authError;
        if (alive && data.session) setUid(data.session.user.id);
        else if (alive) router.replace("/auth");
      } catch {
        if (alive) setError("登录状态读取失败，请重新进入");
      }
    })();
    return () => { alive = false; };
  }, [router]);

  function stopCamera() {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }

  useEffect(() => () => {
    stopCamera();
    recordStreamRef.current?.getTracks().forEach(t => t.stop());
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

  async function startCamera(next: "user" | "environment" = facing) {
    setError("");
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("camera");
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: next }, width: { ideal: 1080 }, height: { ideal: 1920 }, frameRate: { ideal: 30, max: 30 } },
        audio: true,
      });
      streamRef.current = stream;
      for (const el of [videoRef.current, bgVideoRef.current]) {
        if (el) { el.srcObject = stream; await el.play().catch(() => undefined); }
      }
      setFlash(false);
    } catch {
      setError("请允许星流使用摄像头和麦克风");
    }
  }

  useEffect(() => { if (uid && !result) void startCamera(facing); }, [uid, facing, result]);

  async function switchCamera() {
    if (recording) return;
    const next = facing === "user" ? "environment" : "user";
    setFacing(next);
  }

  async function toggleFlash() {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return setError("相机还没有准备好");
    const caps = track.getCapabilities?.() as MediaTrackCapabilities & { torch?: boolean };
    if (!caps.torch) return setError("当前设备不支持闪光灯控制");
    try {
      await track.applyConstraints({ advanced: [{ torch: !flash } as MediaTrackConstraintSet] });
      setFlash(v => !v);
    } catch { setError("闪光灯暂时不可用"); }
  }

  function canvasSize() { return [720, 1280] as const; }

  function drawFrame(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, source: HTMLVideoElement) {
    const sw = source.videoWidth || 1080, sh = source.videoHeight || 1920;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const cover = Math.max(canvas.width / sw, canvas.height / sh);
    const cw = sw * cover, ch = sh * cover;
    ctx.save();
    ctx.filter = "blur(28px) brightness(.72)";
    ctx.drawImage(source, (canvas.width - cw) / 2, (canvas.height - ch) / 2, cw, ch);
    ctx.restore();
    const contain = Math.min(canvas.width / sw, canvas.height / sh);
    const dw = sw * contain, dh = sh * contain;
    ctx.save();
    ctx.filter = liveFilter;
    if (facing === "user") { ctx.translate(canvas.width, 0); ctx.scale(-1, 1); }
    ctx.drawImage(source, (canvas.width - dw) / 2, (canvas.height - dh) / 2, dw, dh);
    ctx.restore();
  }

  function takePhoto() {
    const source = videoRef.current;
    if (!source || !source.videoWidth) return setError("相机还没有准备好");
    const [w, h] = canvasSize();
    const canvas = document.createElement("canvas"); canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    drawFrame(ctx, canvas, source);
    setResult(canvas.toDataURL("image/jpeg", .94));
    setResultType("image");
    stopCamera();
  }

  function mime() {
    if (typeof MediaRecorder === "undefined") return "";
    return ["video/mp4;codecs=h264,aac", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm"].find(x => MediaRecorder.isTypeSupported(x)) || "";
  }

  function startRecording() {
    if (recording) return;
    if (countdown) {
      setCountLeft(countdown);
      let n = countdown;
      const timer = window.setInterval(() => {
        n -= 1; setCountLeft(n);
        if (n <= 0) { window.clearInterval(timer); setCountLeft(0); actuallyRecord(); }
      }, 1000);
      return;
    }
    actuallyRecord();
  }

  function actuallyRecord() {
    const source = videoRef.current, camera = streamRef.current, type = mime();
    if (!source || !camera) return setError("相机还没有准备好");
    if (!type) return setError("当前浏览器不支持视频录制");
    const canvas = document.createElement("canvas"); canvas.width = 720; canvas.height = 1280;
    const ctx = canvas.getContext("2d", { alpha: false }); if (!ctx) return setError("相机画面启动失败");
    const loop = () => { drawFrame(ctx, canvas, source); rafRef.current = requestAnimationFrame(loop); };
    loop();
    try {
      const output = canvas.captureStream(30);
      camera.getAudioTracks().forEach(t => output.addTrack(t));
      recordStreamRef.current = output;
      const rec = new MediaRecorder(output, { mimeType: type });
      chunksRef.current = [];
      rec.ondataavailable = e => { if (e.data.size) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current); rafRef.current = null;
        output.getTracks().forEach(t => t.stop()); recordStreamRef.current = null;
        const blob = new Blob(chunksRef.current, { type });
        setResult(URL.createObjectURL(blob)); setResultType("video"); setRecording(false); stopCamera();
      };
      recorderRef.current = rec; rec.start(250); setRecording(true); setSeconds(0);
      const started = Date.now();
      const tick = () => {
        if (recorderRef.current === rec && rec.state === "recording") {
          const s = Math.floor((Date.now() - started) / 1000); setSeconds(s);
          if (s >= duration) { rec.stop(); recorderRef.current = null; return; }
          requestAnimationFrame(tick);
        }
      };
      tick();
    } catch { setError("当前浏览器无法启动录制"); }
  }

  function stopRecording() {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    recorderRef.current = null; setRecording(false);
  }

  function shutter() {
    if (recording) return stopRecording();
    if (mode === "photo") return takePhoto();
    startRecording();
  }

  function choose(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    if (!f.type.startsWith("video/")) return setError("请选择视频文件");
    stopCamera(); setResult(URL.createObjectURL(f)); setResultType("video");
  }

  async function publish() {
    if (!supabase || !uid || !result) return setError("请先拍摄作品");
    if (!title.trim()) return setError("写一句作品文案再发布");
    try {
      const response = await fetch(result); const blob = await response.blob();
      const ext = resultType === "image" ? "jpg" : (blob.type.includes("mp4") ? "mp4" : "webm");
      const id = crypto.randomUUID(); const path = `${uid}/${id}.${ext}`;
      const up = await supabase.storage.from("videos").upload(path, blob, { contentType: blob.type, upsert: false });
      if (up.error) throw up.error;
      const url = supabase.storage.from("videos").getPublicUrl(path).data.publicUrl;
      const db = await supabase.from("videos").insert({ user_id: uid, url, title: title.trim(), status: "published" });
      if (db.error) throw db.error;
      router.replace("/");
    } catch (e) { setError(`发布失败：${e instanceof Error ? e.message : "请重试"}`); }
  }

  if (!uid) return <main className="loading">正在打开相机…</main>;

  return <main className="camera">
    <style jsx global>{`
      *{box-sizing:border-box}html,body{margin:0!important;background:#000!important;overflow:hidden!important}.camera{position:fixed;inset:0;background:#000;color:#fff;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif}.stage{position:absolute;inset:0;overflow:hidden;background:#050505}.camBg,.camMain{position:absolute;inset:0;width:100%;height:100%;display:block}.camBg{object-fit:cover;filter:blur(24px) brightness(.65);transform:scale(1.06);opacity:.92}.camMain{object-fit:contain;filter:${liveFilter};transform:${facing === "user" ? "scaleX(-1)" : "none"}}.shade{position:absolute;inset:0;pointer-events:none;background:linear-gradient(#0008,transparent 22%,transparent 66%,#000c 100%)}.top{position:absolute;left:0;right:0;top:0;height:92px;padding:max(14px,env(safe-area-inset-top)) 18px 0;display:grid;grid-template-columns:48px 1fr 48px;align-items:center;z-index:10}.circle{width:46px;height:46px;border:0;border-radius:50%;background:#0008;color:#fff;display:grid;place-items:center}.music{justify-self:center;background:#383838e8;border:0;border-radius:17px;color:#fff;padding:13px 21px;font-size:16px;font-weight:800;backdrop-filter:blur(15px)}.rightTools{position:absolute;right:13px;top:110px;z-index:10;display:flex;flex-direction:column;align-items:center;gap:16px}.rt{width:58px;border:0;background:none;color:#fff;text-shadow:0 2px 8px #000;display:flex;flex-direction:column;align-items:center;gap:4px;font-size:12px;font-weight:800}.rt .ico{width:45px;height:45px;border-radius:50%;display:grid;place-items:center;background:#0005}.rt.active .ico{background:#fff;color:#111}.divider{width:30px;height:1px;background:#fff6;margin:-2px 0}.panel{position:absolute;right:70px;top:112px;width:240px;z-index:20;background:#151515ef;border:1px solid #ffffff22;border-radius:18px;padding:15px;backdrop-filter:blur(20px)}.label{font-size:12px;color:#aaa;margin-bottom:10px}.chips{display:flex;gap:7px;flex-wrap:wrap}.chip{border:1px solid #444;background:#202020;color:#ddd;border-radius:999px;padding:8px 11px}.chip.on{background:#fff;color:#000}.range{width:100%}.count{position:absolute;inset:0;display:grid;place-items:center;z-index:30;font-size:120px;font-weight:900;text-shadow:0 5px 30px #000}.filters{position:absolute;left:18px;right:80px;bottom:230px;z-index:8;display:flex;gap:8px;overflow:auto;padding:4px}.filters button{border:1px solid #fff4;background:#0008;color:#fff;border-radius:11px;padding:9px 12px;white-space:nowrap;font-size:11px}.filters .on{background:#fff;color:#000}.bottom{position:absolute;left:0;right:0;bottom:0;z-index:9;padding:0 18px max(25px,calc(25px + env(safe-area-inset-bottom)));background:linear-gradient(transparent,#000b 22%,#000 70%)}.modes{display:flex;justify-content:center;gap:31px;align-items:center;margin-bottom:20px}.modes button{border:0;background:none;color:#fff;font-size:18px;font-weight:800;padding:8px 10px}.modes .on{background:#fff;color:#111;border-radius:22px}.captureRow{display:flex;justify-content:center;align-items:center;gap:72px}.smallAction{width:58px;height:58px;border:0;border-radius:15px;background:#0009;color:#fff;display:grid;place-items:center}.capture{width:84px;height:84px;border:4px solid #fff;border-radius:50%;background:#fff;box-shadow:0 0 0 5px #0007}.capture.rec{background:#ff3155}.capture.rec:after{content:"";display:block;width:29px;height:29px;border-radius:6px;background:#fff;margin:auto}.under{display:flex;justify-content:space-between;align-items:center;margin-top:12px;padding:0 29px;color:#fff;font-size:12px;font-weight:800}.under span{display:flex;align-items:center;gap:5px}.progress{position:absolute;left:0;right:0;bottom:214px;height:3px;background:#fff4;z-index:12}.progress i{display:block;height:100%;background:#fff}.error{position:absolute;left:18px;right:75px;top:96px;z-index:50;background:#7e2330e8;border-radius:12px;padding:10px;text-align:center;font-size:12px}.preview{position:absolute;inset:0;background:#000;z-index:40;display:flex;flex-direction:column}.previewHead{height:70px;display:flex;align-items:center;justify-content:space-between;padding:0 16px;padding-top:env(safe-area-inset-top)}.media{flex:1;display:grid;place-items:center;min-height:0}.media video,.media img{max-width:100%;max-height:100%;object-fit:contain}.publishBox{padding:12px 18px max(22px,calc(22px + env(safe-area-inset-bottom)))}.publishBox input{width:100%;height:48px;border-radius:12px;border:1px solid #333;background:#171717;color:#fff;padding:0 14px;margin-bottom:10px}.publishBox button{width:100%;height:50px;border:0;border-radius:13px;background:#fff;color:#000;font-weight:800}.loading{min-height:100dvh;background:#000;color:#fff;display:grid;place-items:center}
    `}</style>

    <section className="stage">
      <video ref={bgVideoRef} className="camBg" playsInline muted />
      <video ref={videoRef} className="camMain" playsInline muted />
      <div className="shade" />
      <header className="top">
        <button className="circle" onClick={() => router.back()}><ArrowLeft size={27}/></button>
        <button className="music" onClick={() => setError("音乐选择功能正在完善中")}>♫　选择音乐</button>
        <button className="circle" onClick={switchCamera}><SwitchCamera size={24}/></button>
      </header>

      <div className="rightTools">
        <button className="rt" onClick={switchCamera}><span className="ico"><RotateCcw size={27}/></span><span>翻转</span></button>
        <button className={`rt ${flash ? "active" : ""}`} onClick={toggleFlash}><span className="ico"><Flashlight size={27}/></span><span>闪光灯</span></button>
        <button className="rt" onClick={() => setError("相机设置已采用最佳参数") }><span className="ico"><Camera size={26}/></span><span>设置</span></button>
        <div className="divider"/>
        <button className={`rt ${tool === "timer" ? "active" : ""}`} onClick={() => setTool(tool === "timer" ? null : "timer")}><span className="ico"><Clock3 size={26}/></span><span>倒计时</span></button>
        <button className={`rt ${tool === "beauty" ? "active" : ""}`} onClick={() => setTool(tool === "beauty" ? null : "beauty")}><span className="ico"><Sparkles size={26}/></span><span>美颜</span></button>
        <button className="rt" onClick={() => setError("更多拍摄功能即将加入") }><span className="ico"><MoreVertical size={27}/></span><span>更多</span></button>
      </div>

      {tool === "beauty" && <div className="panel"><div className="label">自然美颜　{beauty}%</div><input className="range" type="range" min="0" max="100" value={beauty} onChange={e => setBeauty(Number(e.target.value))}/></div>}
      {tool === "timer" && <div className="panel"><div className="label">倒计时</div><div className="chips">{COUNTDOWNS.map(v => <button key={v} className={`chip ${countdown === v ? "on" : ""}`} onClick={() => {setCountdown(v);setTool(null)}}>{v ? `${v}秒` : "关闭"}</button>)}</div></div>}
      {tool === "speed" && <div className="panel"><div className="label">速度</div><div className="chips">{SPEEDS.map(v => <button key={v} className={`chip ${speed === v ? "on" : ""}`} onClick={() => {setSpeed(v);setTool(null)}}>{v}x</button>)}</div></div>}
      {countLeft > 0 && <div className="count">{countLeft}</div>}
      {error && <div className="error">{error}</div>}
      {recording && <div className="progress"><i style={{width:`${Math.min(100, seconds / duration * 100)}%`}}/></div>}

      <div className="filters">{FILTERS.map((f,i)=><button key={f[0]} className={filter===i?"on":""} onClick={() => setFilter(i)}>{f[0]}</button>)}</div>
      <div className="bottom">
        <div className="modes">
          <button className={mode === "segment" ? "on" : ""} onClick={() => setMode("segment")}>分段拍</button>
          <button className={mode === "photo" ? "on" : ""} onClick={() => setMode("photo")}>照片</button>
          <button className={mode === "video" ? "on" : ""} onClick={() => setMode("video")}>视频</button>
        </div>
        <div className="captureRow">
          <button className="smallAction" onClick={() => inputRef.current?.click()}><ImageIcon size={27}/></button>
          <button className={`capture ${recording ? "rec" : ""}`} onClick={shutter} aria-label="拍摄"/>
          <button className="smallAction" onClick={() => setTool(tool === "speed" ? null : "speed")}><Zap size={27}/></button>
        </div>
        <div className="under"><span><Wand2 size={17}/>特效</span><span>相册</span></div>
      </div>
      <input ref={inputRef} hidden type="file" accept="video/*" onChange={choose}/>
    </section>

    {result && <section className="preview">
      <header className="previewHead"><button className="circle" onClick={() => {URL.revokeObjectURL(result);setResult("");setTimeout(() => void startCamera(facing), 0)}}><ArrowLeft size={22}/></button><b>预览作品</b><button className="circle" onClick={() => {URL.revokeObjectURL(result);setResult("")}}><X size={22}/></button></header>
      <div className="media">{resultType === "image" ? <img src={result} alt="作品预览"/> : <video src={result} controls playsInline/>}</div>
      <div className="publishBox"><input value={title} onChange={e => setTitle(e.target.value)} placeholder="说点什么……" maxLength={120}/><button onClick={publish}><Check size={18} style={{verticalAlign:"-4px",marginRight:6}}/>发布到星流</button></div>
    </section>}
    </main>;
}

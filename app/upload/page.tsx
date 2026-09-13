"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, ChevronDown, Clock3, Flashlight, Loader2, Music2, Sparkles, SwitchCamera, Upload, Video, X, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

const MAX_SIZE = 200 * 1024 * 1024;
const MAX_SECONDS = 180;
const MUSIC = ["原创音乐 · 星流", "夜行 · 星流", "夏日心动", "城市霓虹", "热浪节拍", "轻快日常"];
const FILTERS = [
  { name: "原图", value: "none" },
  { name: "清透", value: "brightness(1.08) saturate(1.08) contrast(1.02)" },
  { name: "奶油", value: "brightness(1.1) saturate(.82) sepia(.08) contrast(.96)" },
  { name: "冷调", value: "saturate(.92) hue-rotate(10deg) contrast(1.05)" },
  { name: "电影", value: "contrast(1.16) saturate(.82) brightness(.98)" },
  { name: "复古", value: "sepia(.24) saturate(.9) contrast(1.08)" },
];
const SPEEDS = [0.3, 0.5, 1, 2, 3];

type Mode = "camera" | "library";

async function createVideoCover(sourceUrl: string, filter: string): Promise<Blob | null> {
  return new Promise(resolve => {
    const video = document.createElement("video");
    video.muted = true; video.playsInline = true; video.preload = "metadata"; video.src = sourceUrl;
    const done = () => { try {
      const w=video.videoWidth||720,h=video.videoHeight||1280,tw=720,th=1280,s=Math.max(tw/w,th/h),c=document.createElement("canvas");
      c.width=tw;c.height=th;const ctx=c.getContext("2d");if(!ctx)return resolve(null);
      ctx.filter=filter;ctx.fillStyle="#000";ctx.fillRect(0,0,tw,th);ctx.drawImage(video,(tw-w*s)/2,(th-h*s)/2,w*s,h*s);
      c.toBlob(b=>resolve(b),"image/jpeg",.86);
    } catch { resolve(null) } video.removeAttribute("src");video.load() };
    video.onerror=()=>resolve(null);video.onloadedmetadata=()=>{video.currentTime=video.duration>.6?.6:0};video.onseeked=done;
  });
}

export default function UploadPage(){
  const router=useRouter();
  const fileRef=useRef<HTMLInputElement>(null), videoRef=useRef<HTMLVideoElement>(null), previewRef=useRef<HTMLVideoElement>(null);
  const streamRef=useRef<MediaStream|null>(null), recorderRef=useRef<MediaRecorder|null>(null), timerRef=useRef<ReturnType<typeof setInterval>|null>(null), countdownRef=useRef<ReturnType<typeof setInterval>|null>(null);
  const [userId,setUserId]=useState<string|null>(null),[mode,setMode]=useState<Mode>("camera"),[file,setFile]=useState<File|null>(null),[preview,setPreview]=useState("");
  const [title,setTitle]=useState(""),[music,setMusic]=useState(MUSIC[0]),[musicOpen,setMusicOpen]=useState(false);
  const [recording,setRecording]=useState(false),[seconds,setSeconds]=useState(0),[countdown,setCountdown]=useState(0),[countdownOn,setCountdownOn]=useState(false);
  const [facing,setFacing]=useState<"user"|"environment">("user"),[flash,setFlash]=useState(false),[beauty,setBeauty]=useState(true),[filter,setFilter]=useState(0),[speed,setSpeed]=useState(1),[toolOpen,setToolOpen]=useState(false);
  const [publishing,setPublishing]=useState(false),[progress,setProgress]=useState(0),[error,setError]=useState(""),[done,setDone]=useState(false);

  useEffect(()=>{(async()=>{if(!supabase)return;const{data}=await supabase.auth.getSession();if(!data.session){router.replace("/auth");return}setUserId(data.session.user.id)})()},[router]);
  useEffect(()=>()=>{streamRef.current?.getTracks().forEach(t=>t.stop());if(timerRef.current)clearInterval(timerRef.current);if(countdownRef.current)clearInterval(countdownRef.current);if(preview)URL.revokeObjectURL(preview)},[preview]);

  async function startCamera(nextFacing=facing){setError("");try{
    streamRef.current?.getTracks().forEach(t=>t.stop());
    const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:nextFacing},width:{ideal:1080},height:{ideal:1920}},audio:true});
    streamRef.current=stream;
    if(videoRef.current){videoRef.current.srcObject=stream;await videoRef.current.play()}
    setFlash(false);
  }catch{setError("无法打开相机，请在浏览器设置中允许摄像头和麦克风，或从相册上传。")}}
  useEffect(()=>{if(mode==="camera"&&!file&&typeof navigator!=="undefined"&&navigator.mediaDevices)void startCamera(facing)},[mode,facing]);
  function stopCamera(){streamRef.current?.getTracks().forEach(t=>t.stop());streamRef.current=null}
  function choose(e:ChangeEvent<HTMLInputElement>){const f=e.target.files?.[0];if(!f)return;if(!f.type.startsWith("video/"))return setError("请选择视频文件");if(f.size>MAX_SIZE)return setError("视频不能超过 200MB");stopCamera();if(preview)URL.revokeObjectURL(preview);setError("");setFile(f);setPreview(URL.createObjectURL(f))}

  async function toggleFlash(){
    const track=streamRef.current?.getVideoTracks()[0];
    if(!track)return setError("当前相机不支持闪光灯控制");
    const capabilities=track.getCapabilities?.() as MediaTrackCapabilities & {torch?:boolean};
    if(!capabilities.torch)return setError("当前设备/浏览器不支持闪光灯控制");
    try{await track.applyConstraints({advanced:[{torch:!flash}]} as MediaTrackConstraints);setFlash(v=>!v)}catch{setError("闪光灯暂时不可用")}
  }

  function actuallyRecord(){
    const stream=streamRef.current;if(!stream)return setError("相机还没有准备好，请稍等");
    try{
      const mime=["video/mp4","video/webm;codecs=vp9,opus","video/webm"].find(x=>MediaRecorder.isTypeSupported(x))||"video/webm";
      const r=new MediaRecorder(stream,{mimeType:mime});const chunks:Blob[]=[];
      r.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
      r.onstop=()=>{const blob=new Blob(chunks,{type:mime});const ext=mime.includes("mp4")?"mp4":"webm";const f=new File([blob],`xingliu-${Date.now()}.${ext}`,{type:mime});setFile(f);if(preview)URL.revokeObjectURL(preview);setPreview(URL.createObjectURL(blob));stopCamera()};
      recorderRef.current=r;r.start(250);setRecording(true);setSeconds(0);
      timerRef.current=setInterval(()=>setSeconds(s=>{if(s>=MAX_SECONDS-1){stopRecording();return MAX_SECONDS}return s+1}),1000);
    }catch{setError("当前浏览器不支持直接拍摄，请使用相册上传。")}
  }
  function startRecording(){
    if(countdownOn){setCountdown(3);let n=3;countdownRef.current=setInterval(()=>{n-=1;setCountdown(n);if(n<=0){if(countdownRef.current)clearInterval(countdownRef.current);setCountdownOn(false);actuallyRecord()}},1000)}else actuallyRecord();
  }
  function stopRecording(){const r=recorderRef.current;if(r&&r.state!=="inactive")r.stop();recorderRef.current=null;setRecording(false);if(timerRef.current)clearInterval(timerRef.current)}
  function clearVideo(){stopRecording();stopCamera();if(preview)URL.revokeObjectURL(preview);setFile(null);setPreview("");setDone(false);setSeconds(0);if(fileRef.current)fileRef.current.value=""}
  function switchCamera(){if(!recording)setFacing(x=>x==="user"?"environment":"user")}
  function setPlayback(v:number){setSpeed(v);if(previewRef.current)previewRef.current.playbackRate=v}

  async function publish(){
    if(!supabase||!userId||!file)return setError("请先拍摄或选择一个视频");if(!title.trim())return setError("给作品写一个标题吧");setPublishing(true);setError("");setProgress(8);
    const id=crypto.randomUUID(),ext=file.name.split(".").pop()?.toLowerCase()||"mp4",path=`${userId}/${id}.${ext}`;
    const{error:upErr}=await supabase.storage.from("videos").upload(path,file,{contentType:file.type,cacheControl:"3600",upsert:false});
    if(upErr){setPublishing(false);return setError(`上传失败：${upErr.message}`)}setProgress(58);
    const videoUrl=supabase.storage.from("videos").getPublicUrl(path).data.publicUrl;let coverUrl:string|null=null;
    try{const cover=await createVideoCover(preview,FILTERS[filter].value);if(cover){const cp=`${userId}/covers/${id}.jpg`;const{error}=await supabase.storage.from("videos").upload(cp,cover,{contentType:"image/jpeg",cacheControl:"86400"});if(!error)coverUrl=supabase.storage.from("videos").getPublicUrl(cp).data.publicUrl}}catch{}
    setProgress(82);
    const{error:dbErr}=await supabase.from("videos").insert({user_id:userId,url:videoUrl,title:title.trim(),music:music.trim()||MUSIC[0],status:"published",...(coverUrl?{cover_url:coverUrl}:{})});
    if(dbErr){await supabase.storage.from("videos").remove([path]);setPublishing(false);return setError(`发布失败：${dbErr.message}`)}
    setProgress(100);setDone(true);setPublishing(false);setTimeout(()=>router.replace("/"),700);
  }

  if(!userId&&!done)return <main className="uploadPage"><div className="uploadEmpty"><Video size={48}/><h2>登录后发布作品</h2><p>登录星流，分享你的精彩瞬间</p><button onClick={()=>router.push("/auth")}>去登录</button></div></main>;
  const currentFilter=FILTERS[filter].value;
  return <main className="uploadPage"><style jsx global>{`.uploadPage{min-height:100dvh;background:#000;color:#fff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif}.cameraStage{height:100dvh;position:relative;overflow:hidden;background:#090909}.cameraStage>video{width:100%;height:100%;object-fit:cover;transition:filter .2s;transform:${facing==="user"?"scaleX(-1)":"none"}}.beauty{filter:${beauty?"brightness(1.05) saturate(1.06) contrast(.98) blur(.18px)":"none"}}.top{position:absolute;top:0;left:0;right:0;height:76px;z-index:3;display:flex;align-items:center;justify-content:space-between;padding:0 14px;background:linear-gradient(#000b,transparent)}.top button,.side,.toolBtn{border:0;background:#0008;color:#fff;width:42px;height:42px;border-radius:50%;display:grid;place-items:center}.top b{font-size:16px}.tools{position:absolute;right:14px;top:92px;z-index:4;display:grid;gap:12px}.toolBtn{font-size:10px;width:44px;height:44px}.toolBtn.on{background:#fff;color:#000}.toolPanel{position:absolute;right:66px;top:90px;z-index:5;width:190px;padding:12px;border-radius:16px;background:#151515eF;border:1px solid #333;box-shadow:0 12px 30px #0008}.panelTitle{font-size:12px;color:#aaa;margin:2px 0 9px}.chips{display:flex;gap:7px;flex-wrap:wrap}.chip{border:1px solid #333;background:#111;color:#ddd;border-radius:999px;padding:7px 9px;font-size:11px}.chip.active{background:#fff;color:#000;border-color:#fff}.filterStrip{position:absolute;left:12px;right:12px;bottom:174px;z-index:4;display:flex;gap:9px;overflow-x:auto;padding:6px 0}.filterStrip button{min-width:58px;border:1px solid #555;background:#0009;color:#fff;border-radius:12px;padding:7px 5px;font-size:10px}.filterStrip .active{border-color:#fff;background:#fff;color:#000}.bottom{position:absolute;bottom:0;left:0;right:0;padding:18px 18px 30px;background:linear-gradient(transparent,#000e 40%,#000)}.modes{display:flex;justify-content:center;gap:28px;margin-bottom:16px}.modes button{background:none;border:0;color:#999}.modes .active{color:#fff;font-weight:800}.row{display:flex;align-items:center;justify-content:center;gap:42px}.capture{width:78px;height:78px;border:4px solid #fff;border-radius:50%;background:#fff}.capture.recording{background:#ff3150}.capture.recording:after{content:"";display:block;width:28px;height:28px;background:#fff;border-radius:6px;margin:auto}.time{text-align:center;font-size:13px;margin-bottom:8px}.hint{text-align:center;color:#aaa;font-size:11px;margin-top:12px}.countdown{position:absolute;inset:0;z-index:10;display:grid;place-items:center;font-size:96px;font-weight:900;text-shadow:0 4px 24px #000}.editPage{min-height:100dvh;background:#070707;padding-bottom:50px}.header{height:58px;display:flex;align-items:center;justify-content:space-between;padding:0 18px;border-bottom:1px solid #222}.header button{background:none;border:0;color:#fff}.body{max-width:620px;margin:auto;padding:18px}.preview{height:52dvh;max-height:650px;background:#000;border-radius:16px;overflow:hidden;position:relative}.preview video{width:100%;height:100%;object-fit:contain;transition:filter .2s}.remove{position:absolute;right:10px;top:10px;border:0;border-radius:50%;width:36px;height:36px;background:#000b;color:#fff}.editTools{display:flex;gap:8px;overflow:auto;margin-top:12px}.editTools button{border:1px solid #333;background:#111;color:#ddd;border-radius:12px;padding:9px 12px;white-space:nowrap}.editTools .active{background:#fff;color:#000;border-color:#fff}.musicBox{position:relative;margin-top:12px}.music{height:50px;background:#111;border:1px solid #292929;border-radius:13px;display:flex;align-items:center;gap:10px;padding:0 13px}.music button{border:0;background:none;color:#fff;flex:1;text-align:left}.musicList{position:absolute;left:0;right:0;bottom:58px;background:#151515;border:1px solid #333;border-radius:14px;padding:6px;z-index:3}.musicList button{display:block;width:100%;border:0;background:none;color:#fff;padding:11px;text-align:left;border-radius:9px}.musicList button:hover{background:#222}.body textarea{margin-top:12px;width:100%;min-height:110px;background:#111;border:1px solid #292929;border-radius:13px;color:#fff;padding:13px;resize:none;outline:none;font-size:15px}.counter{text-align:right;color:#666;font-size:11px;margin-top:5px}.tip{margin:14px 2px;color:#999;font-size:12px}.publish{margin-top:12px;width:100%;height:52px;border:0;border-radius:13px;background:#fff;color:#000;font-weight:800;display:flex;align-items:center;justify-content:center;gap:8px}.publish:disabled{opacity:.4}.error{color:#ff7272;font-size:13px;margin:12px 2px}.progress{height:5px;background:#222;border-radius:9px;overflow:hidden;margin:12px 0}.progress i{display:block;height:100%;background:#fff;transition:width .2s}.uploadEmpty{text-align:center;padding:110px 20px;color:#888}.uploadEmpty h2{color:#fff}.uploadEmpty button{margin-top:15px;border:0;border-radius:12px;padding:12px 28px;background:#fff;color:#000;font-weight:700}.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    {!file?<section className="cameraStage"><video ref={videoRef} className={beauty?"beauty":""} playsInline muted style={{filter:currentFilter}}/>
      {countdown>0&&<div className="countdown">{countdown}</div>}
      <div className="top"><button onClick={()=>router.back()}><ArrowLeft/></button><b>拍摄</b><button onClick={()=>{setMode("library");fileRef.current?.click()}}><Upload/></button></div>
      <div className="tools"><button className={`toolBtn ${beauty?"on":""}`} onClick={()=>setBeauty(v=>!v)}><Sparkles size={18}/></button><button className={`toolBtn ${flash?"on":""}`} onClick={toggleFlash}><Flashlight size={18}/></button><button className={`toolBtn ${countdownOn?"on":""}`} onClick={()=>setCountdownOn(v=>!v)}><Clock3 size={18}/></button><button className="toolBtn" onClick={()=>setToolOpen(v=>!v)}><Zap size={18}/></button></div>
      {toolOpen&&<div className="toolPanel"><div className="panelTitle">拍摄速度</div><div className="chips">{SPEEDS.map(v=><button key={v} className={`chip ${speed===v?"active":""}`} onClick={()=>setPlayback(v)}>{v}x</button>)}</div><div className="panelTitle" style={{marginTop:12}}>功能</div><div className="chips"><button className={`chip ${beauty?"active":""}`} onClick={()=>setBeauty(v=>!v)}>美颜</button><button className={`chip ${countdownOn?"active":""}`} onClick={()=>setCountdownOn(v=>!v)}>3秒倒计时</button></div></div>}
      <div className="filterStrip">{FILTERS.map((f,i)=><button key={f.name} className={filter===i?"active":""} onClick={()=>setFilter(i)}>{f.name}</button>)}</div>
      <div className="bottom">{recording&&<div className="time">{String(Math.floor(seconds/60)).padStart(2,"0")}:{String(seconds%60).padStart(2,"0")} / 03:00</div>}<div className="modes"><button className="active">拍摄</button><button onClick={()=>{setMode("library");fileRef.current?.click()}}>相册</button></div><div className="row"><button className="side" onClick={()=>{setMode("library");fileRef.current?.click()}}><Upload size={20}/></button><button className={`capture ${recording?"recording":""}`} onClick={recording?stopRecording:startRecording} aria-label={recording?"停止拍摄":"开始拍摄"}/><button className="side" onClick={switchCamera}><SwitchCamera size={21}/></button></div><div className="hint">美颜 · 滤镜 · 倍速 · 倒计时 · 闪光灯 · 最长 3 分钟</div></div><input ref={fileRef} hidden type="file" accept="video/*" onChange={choose}/></section>
    :<section className="editPage"><header className="header"><button onClick={clearVideo}><ArrowLeft/> 重拍</button><b>发布作品</b><button onClick={()=>router.push("/")}>取消</button></header><div className="body"><div className="preview"><video ref={previewRef} src={preview} controls playsInline style={{filter:currentFilter}} onLoadedMetadata={()=>{if(previewRef.current)previewRef.current.playbackRate=speed}}/><button className="remove" onClick={clearVideo}><X size={18}/></button></div><div className="editTools">{FILTERS.map((f,i)=><button key={f.name} className={filter===i?"active":""} onClick={()=>setFilter(i)}>{f.name}</button>)}{SPEEDS.map(v=><button key={`s${v}`} className={speed===v?"active":""} onClick={()=>setPlayback(v)}>{v}x</button>)}</div><div className="musicBox"><div className="music"><Music2 size={20}/><button onClick={()=>setMusicOpen(v=>!v)}>{music}</button><ChevronDown size={17}/></div>{musicOpen&&<div className="musicList">{MUSIC.map(m=><button key={m} onClick={()=>{setMusic(m);setMusicOpen(false)}}>{m}</button>)}</div>}</div><textarea value={title} onChange={e=>setTitle(e.target.value.slice(0,120))} placeholder="说点什么……添加作品标题或文案" maxLength={120}/><div className="counter">{title.length}/120</div><div className="tip">公开发布 · 发布成功后自动进入首页推荐流</div>{publishing&&<div className="progress"><i style={{width:`${progress}%`}}/></div>}{error&&<div className="error">{error}</div>}<button className="publish" disabled={publishing||!title.trim()} onClick={publish}>{publishing?<><Loader2 className="spin" size={20}/>正在发布 {progress}%</>:done?<><Check size={20}/>发布成功</>:"发布到星流"}</button></div></section>}
  </main>;
}
"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import { ArrowLeft, Camera, Check, ChevronRight, Loader2, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

const TAG_OPTIONS = ["音乐","旅行","美食","摄影","运动","游戏","科技","宠物","穿搭","生活"];

export default function SettingsPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const bgFileRef = useRef<HTMLInputElement>(null);
  const [session,setSession]=useState<any>(null);
  const [profile,setProfile]=useState<any>(null);
  const [nickname,setNickname]=useState("");
  const [bio,setBio]=useState("");
  const [gender,setGender]=useState("保密");
  const [tags,setTags]=useState<string[]>([]);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [uploading,setUploading]=useState(false);
  const [bgUploading,setBgUploading]=useState(false);
  const [msg,setMsg]=useState("");
  const [showGender,setShowGender]=useState(false);

  useEffect(()=>{(async()=>{
    if(!supabase){router.replace("/auth");return}
    const {data}=await supabase.auth.getSession();
    if(!data.session){router.replace("/auth?returnTo=/profile");return}
    setSession(data.session);
    const {data:p}=await supabase.from("profiles").select("*").eq("id",data.session.user.id).maybeSingle();
    const next=p||{nickname:"星流用户",display_name:"",bio:"",gender:"保密",tags:[]};
    setProfile(next); setNickname(next.nickname||next.display_name||""); setBio(next.bio||""); setGender(next.gender||"保密"); setTags(Array.isArray(next.tags)?next.tags:[]);
    setLoading(false);
  })()},[router]);

  async function uploadAvatar(e:ChangeEvent<HTMLInputElement>){
    const file=e.target.files?.[0]; if(!file||!session||!supabase)return;
    if(!file.type.startsWith("image/")){setMsg("请选择图片文件");return}
    if(file.size>5*1024*1024){setMsg("头像不能超过 5MB");return}
    setUploading(true);setMsg("");
    const ext=(file.name.split(".").pop()||"jpg").toLowerCase().replace(/[^a-z0-9]/g,"")||"jpg";
    const path=`${session.user.id}/avatar-${Date.now()}.${ext}`;
    const {error}=await supabase.storage.from("avatars").upload(path,file,{upsert:false,contentType:file.type});
    if(error){setMsg("头像上传失败："+error.message);setUploading(false);return}
    const {data}=supabase.storage.from("avatars").getPublicUrl(path);
    const {error:updateError}=await supabase.from("profiles").update({avatar_url:data.publicUrl}).eq("id",session.user.id);
    if(updateError){setMsg("头像已上传，但资料保存失败："+updateError.message);setUploading(false);return}
    setProfile((p:any)=>({...p,avatar_url:data.publicUrl}));setMsg("头像已更新");setUploading(false);
  }

  async function uploadBackground(e:ChangeEvent<HTMLInputElement>){
    const file=e.target.files?.[0]; if(!file||!session||!supabase)return;
    if(!file.type.startsWith("image/")){setMsg("请选择图片文件");return}
    if(file.size>10*1024*1024){setMsg("背景图不能超过 10MB");return}
    setBgUploading(true);setMsg("");
    const ext=(file.name.split(".").pop()||"jpg").toLowerCase().replace(/[^a-z0-9]/g,"")||"jpg";
    const path=`${session.user.id}/background-${Date.now()}.${ext}`;
    const {error}=await supabase.storage.from("profile-backgrounds").upload(path,file,{upsert:false,contentType:file.type});
    if(error){setMsg("背景图上传失败："+error.message);setBgUploading(false);return}
    const {data}=supabase.storage.from("profile-backgrounds").getPublicUrl(path);
    const {error:updateError}=await supabase.from("profiles").update({background_url:data.publicUrl}).eq("id",session.user.id);
    if(updateError){setMsg("背景图已上传，但资料保存失败："+updateError.message);setBgUploading(false);return}
    setProfile((p:any)=>({...p,background_url:data.publicUrl}));setMsg("主页背景已更新");setBgUploading(false);
  }

  async function save(){
    if(!supabase||!session)return;
    if(!nickname.trim()){setMsg("昵称不能为空");return}
    if(nickname.trim().length>20){setMsg("昵称最多 20 个字");return}
    if(bio.length>100){setMsg("简介最多 100 个字");return}
    setSaving(true);setMsg("");
    const {data,error}=await supabase.from("profiles").update({
      nickname:nickname.trim(), display_name:nickname.trim(), bio:bio.trim(), gender, tags
    }).eq("id",session.user.id).select().maybeSingle();
    if(error){setMsg("保存失败："+error.message);setSaving(false);return}
    setProfile(data||{...profile,nickname:nickname.trim(),display_name:nickname.trim(),bio:bio.trim(),gender,tags});
    setMsg("资料已保存");
    setSaving(false);
  }

  function toggleTag(tag:string){setTags(old=>old.includes(tag)?old.filter(x=>x!==tag):old.length>=5?old:[...old,tag])}

  if(loading)return <main className="edit-page"><div className="loading">加载中…</div></main>;

  return <main className="edit-page">
    <style jsx global>{`
      *{box-sizing:border-box}html,body{margin:0;background:#f6f6f7;color:#17181d;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","PingFang SC","Microsoft YaHei",sans-serif}button,input,textarea{font:inherit}
      .edit-page{min-height:100dvh;background:#f6f6f7;padding-bottom:35px}.wrap{max-width:680px;margin:auto}
      .top{height:60px;background:#fff;display:flex;align-items:center;justify-content:space-between;padding:0 17px;border-bottom:1px solid #eee;position:sticky;top:0;z-index:10}.top button{border:0;background:none;width:42px;height:42px;display:grid;place-items:center}.top b{font-size:18px}.saveTop{color:#ff2f62;font-weight:800}
      .hero{background:#fff;text-align:center;padding:30px 20px 28px}.avatarBox{position:relative;width:112px;height:112px;margin:auto}.avatar{width:112px;height:112px;border-radius:50%;object-fit:cover;background:#e8e8ea;border:3px solid #fff;box-shadow:0 2px 12px #0001}.camera{position:absolute;right:0;bottom:1px;width:38px;height:38px;border-radius:50%;border:3px solid #fff;background:#222;color:#fff;display:grid;place-items:center}.avatarHint{margin-top:10px;color:#777;font-size:13px}
      .card{margin-top:12px;background:#fff;border-top:1px solid #eee;border-bottom:1px solid #eee}.row{min-height:62px;padding:0 20px;display:flex;align-items:center;border:0;border-bottom:1px solid #f0f0f1;background:#fff;width:100%;text-align:left}.row:last-child{border-bottom:0}.label{width:72px;font-size:15px;color:#333;flex:none}.value{flex:1;text-align:right;color:#777;font-size:15px}.chev{margin-left:7px;color:#aaa}
      .input{width:100%;border:0;outline:0;text-align:right;background:transparent;color:#17181d;font-size:15px}.textareaRow{align-items:flex-start;padding-top:17px;padding-bottom:17px}.textarea{width:100%;min-height:70px;border:0;outline:0;resize:none;text-align:right;color:#17181d;background:transparent;line-height:1.5}
      .sectionTitle{font-size:13px;color:#888;padding:23px 20px 9px}.tags{padding:8px 20px 18px;display:flex;gap:9px;flex-wrap:wrap}.tag{border:1px solid #e1e1e4;background:#fafafa;border-radius:18px;padding:8px 13px;color:#555}.tag.on{background:#fff0f4;border-color:#ff7a9a;color:#ff3d6b}.tag.custom{display:flex;align-items:center;gap:5px}
      .genderPanel{position:fixed;inset:0;background:#0005;z-index:30;display:flex;align-items:flex-end}.sheet{width:100%;background:#fff;border-radius:22px 22px 0 0;padding:10px 0 calc(10px + env(safe-area-inset-bottom));animation:up .18s ease}.sheet b{display:block;text-align:center;padding:12px}.genderOption{height:52px;width:100%;border:0;background:#fff;border-top:1px solid #eee}.genderOption.on{color:#ff3564;font-weight:800}.cancel{color:#888}
      .hint{padding:13px 20px;color:#999;font-size:12px}.message{margin:12px 20px 0;background:#fff0f4;color:#ff3d68;border-radius:10px;padding:11px 13px;font-size:13px}.loading{min-height:100dvh;display:grid;place-items:center;color:#888}
      .bottomSave{display:block;margin:20px;border:0;width:calc(100% - 40px);height:52px;border-radius:10px;background:#ff3565;color:#fff;font-size:17px;font-weight:800}.bottomSave:disabled{opacity:.55}
      @keyframes up{from{transform:translateY(30px);opacity:.5}to{transform:none;opacity:1}}
    `}</style>
    <div className="wrap">
      <header className="top"><button onClick={()=>router.back()}><ArrowLeft size={22}/></button><b>编辑主页</b><button className="saveTop" onClick={save} disabled={saving}>{saving?"保存中":"保存"}</button></header>
      {msg&&<div className="message">{msg}</div>}
      <section className="hero">
        <div className="avatarBox"><img className="avatar" src={profile?.avatar_url||"/icon.svg"} alt="头像"/><button className="camera" onClick={()=>fileRef.current?.click()} disabled={uploading}>{uploading?<Loader2 size={17} className="spin"/>:<Camera size={18}/>}</button></div>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={uploadAvatar}/>
        <div className="avatarHint">点击更换头像 · 支持 JPG / PNG，最大 5MB</div>
      </section>

      <section className="card">
        <div className="row"><span className="label">昵称</span><input className="input" value={nickname} onChange={e=>setNickname(e.target.value)} maxLength={20} placeholder="请输入昵称"/></div>
        <div className="row"><span className="label">星流号</span><span className="value">{profile?.username||session?.user?.id?.slice(0,8)||"未设置"}</span></div>
        <button className="row" onClick={()=>setShowGender(true)}><span className="label">性别</span><span className="value">{gender}</span><ChevronRight size={17} className="chev"/></button>
        <div className="row textareaRow"><span className="label">简介</span><textarea className="textarea" value={bio} onChange={e=>setBio(e.target.value)} maxLength={100} placeholder="介绍一下自己，让大家认识你"/></div>
      </section>

      <div className="sectionTitle">兴趣标签（最多选择 5 个）</div>
      <section className="card"><div className="tags">{TAG_OPTIONS.map(t=><button key={t} className={tags.includes(t)?"tag on":"tag"} onClick={()=>toggleTag(t)}>{tags.includes(t)?"✓ ":"＋ "}{t}</button>)}<button className="tag custom" onClick={()=>setMsg("自定义标签功能下一版加入")}><Plus size={14}/>自定义</button></div></section>
      <div className="hint">修改后点击右上角「保存」，个人主页会立即同步更新。</div>
      <button className="bottomSave" onClick={save} disabled={saving}>{saving?"保存中…":"保存资料"}</button>
    </div>
    {showGender&&<div className="genderPanel" onClick={()=>setShowGender(false)}><div className="sheet" onClick={e=>e.stopPropagation()}><b>选择性别</b>{["男","女","保密"].map(x=><button key={x} className={gender===x?"genderOption on":"genderOption"} onClick={()=>{setGender(x);setShowGender(false)}}>{x}</button>)}<button className="genderOption cancel" onClick={()=>setShowGender(false)}>取消</button></div></div>}
  </main>;
}

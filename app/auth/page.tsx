"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function AuthPage() {
  const router = useRouter();
  const [mode,setMode]=useState<"login"|"register">("login");
  const [nickname,setNickname]=useState(""); const [username,setUsername]=useState(""); const [password,setPassword]=useState(""); const [confirmPassword,setConfirmPassword]=useState(""); const [error,setError]=useState(""); const [loading,setLoading]=useState(false);
  useEffect(()=>{if(!supabase)return;supabase.auth.getSession().then(({data})=>{if(data.session)router.replace("/")})},[router]);
  async function handleSubmit(e:FormEvent){e.preventDefault();setError("");setLoading(true);try{
    if(!supabase){setError("登录服务尚未配置，请检查 Vercel 环境变量");return}
    if(mode==="register"){
      if(!nickname.trim()){setError("请输入昵称");return} if(username.trim().length<3){setError("账号至少需要 3 个字符");return} if(password.length<6){setError("密码至少需要 6 个字符");return} if(password!==confirmPassword){setError("两次输入的密码不一致");return}
      const email=`${username.trim().toLowerCase().replace(/[^a-z0-9._-]/g,"") || "user"}@xingliu.app`;
      const {data,error}=await supabase.auth.signUp({email,password}); if(error)throw error; const id=data.user?.id; if(!id)throw new Error("注册失败，请稍后重试");
      const {error:profileError}=await supabase.from("profiles").upsert({id,username:username.trim(),display_name:nickname.trim()}); if(profileError)throw profileError;
      router.replace("/"); return;
    }
    const email=`${username.trim().toLowerCase().replace(/[^a-z0-9._-]/g,"") || "user"}@xingliu.app`;
    const {error}=await supabase.auth.signInWithPassword({email,password}); if(error)throw error; router.replace("/");
  }catch(err){setError(err instanceof Error?err.message:"操作失败，请稍后重试")}finally{setLoading(false)}}
  return <main className="auth-page"><div className="auth-box"><div className="auth-logo">星流</div><div className="auth-subtitle">发现有趣短视频</div><div className="auth-tabs"><button className={mode==="login"?"active":""} onClick={()=>{setMode("login");setError("")}}>登录</button><button className={mode==="register"?"active":""} onClick={()=>{setMode("register");setError("")}}>注册</button></div><form onSubmit={handleSubmit}>{mode==="register"&&<div className="field"><label>昵称</label><input value={nickname} onChange={e=>setNickname(e.target.value)} placeholder="请输入昵称" maxLength={20}/></div>}<div className="field"><label>账号</label><input value={username} onChange={e=>setUsername(e.target.value)} placeholder="请输入账号" autoComplete="username"/></div><div className="field"><label>密码</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="请输入密码" autoComplete={mode==="login"?"current-password":"new-password"}/></div>{mode==="register"&&<div className="field"><label>确认密码</label><input type="password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} placeholder="再次输入密码" autoComplete="new-password"/></div>}{error&&<div className="auth-error">{error}</div>}<button className="submit-button" type="submit" disabled={loading}>{loading?"处理中...":mode==="login"?"登录星流":"创建账号"}</button></form><div className="auth-tip">账号会同步保存到星流云端，换设备也能登录。</div></div></main>;
}

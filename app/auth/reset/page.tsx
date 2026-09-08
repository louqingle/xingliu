"use client";

import { FormEvent, useState } from "react";
import { ArrowLeft, CheckCircle2, Mail } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";

function safeReturnTo(value: string | null) { return value && value.startsWith("/") && !value.startsWith("//") ? value : "/"; }

export default function ResetPage() {
  const router = useRouter();
  const params = useSearchParams();
  const returnTo = safeReturnTo(params.get("returnTo"));
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault(); setError("");
    const clean = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) { setError("请输入正确的邮箱地址"); return; }
    if (!supabase) { setError("登录服务未配置"); return; }
    setLoading(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(clean, { redirectTo: `${window.location.origin}/auth/update-password?returnTo=${encodeURIComponent(returnTo)}` });
    setLoading(false);
    if (resetError) { setError(resetError.message); return; }
    setSent(true);
  }

  return <main className="auth-page-v2"><style jsx global>{`.auth-page-v2{min-height:100dvh;background:#050505;color:#fff;display:grid;place-items:center;padding:20px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif}.reset-card{width:min(430px,100%);background:#0d0d0d;border:1px solid #ffffff12;border-radius:25px;padding:28px 24px;box-shadow:0 30px 100px #000}.back{display:flex;align-items:center;gap:6px;color:#888;font-size:13px;margin-bottom:28px}.icon{width:48px;height:48px;border-radius:15px;background:#fff;color:#000;display:grid;place-items:center;margin-bottom:18px}.reset-card h1{margin:0;font-size:27px}.reset-card p{color:#777;font-size:13px;line-height:1.6;margin:9px 0 22px}.field{height:52px;width:100%;border:1px solid #292929;background:#141414;border-radius:13px;color:#fff;padding:0 14px;outline:none}.submit{width:100%;height:53px;border:0;border-radius:13px;background:#fff;color:#000;font-weight:800;margin-top:13px}.msg{margin-top:15px;padding:12px;border-radius:11px;background:#122419;color:#8ee5aa;font-size:12px;line-height:1.5}.err{background:#291315;color:#ff9a9f}.link{color:#aaa;background:none;border:0;margin-top:17px;font-size:12px}`}</style><section className="reset-card"><button className="back" onClick={()=>router.back()}><ArrowLeft size={16}/> 返回登录</button><div className="icon"><Mail size={22}/></div><h1>找回密码</h1><p>输入注册邮箱，我们会发送密码重置链接。</p>{!sent ? <form onSubmit={submit}><input className="field" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email"/><button className="submit" disabled={loading}>{loading ? "正在发送…" : "发送重置邮件"}</button></form> : <div className="msg"><CheckCircle2 size={15}/> 重置邮件已发送。请打开邮箱中的链接设置新密码。</div>}{error && <div className="msg err">{error}</div>}<button className="link" onClick={()=>router.replace(`/auth?returnTo=${encodeURIComponent(returnTo)}`)}>回到登录</button></section></main>;
}

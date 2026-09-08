"use client";

import { FormEvent, useEffect, useState } from "react";
import { CheckCircle2, LockKeyhole } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

function safeReturnTo(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [returnTo, setReturnTo] = useState("/");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setReturnTo(safeReturnTo(new URLSearchParams(window.location.search).get("returnTo")));
    if (!supabase) return;

    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });

    supabase.auth.getSession().then(({ data: sessionData }) => {
      if (sessionData.session) setReady(true);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 6) { setError("密码至少需要 6 位"); return; }
    if (password !== confirm) { setError("两次输入的密码不一致"); return; }
    if (!supabase) { setError("登录服务未配置"); return; }
    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) { setError(updateError.message); return; }
    setDone(true);
    window.setTimeout(() => router.replace(returnTo), 1200);
  }

  return <main className="up-page"><style jsx global>{`.up-page{min-height:100dvh;background:#050505;color:#fff;display:grid;place-items:center;padding:20px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif}.up-card{width:min(430px,100%);background:#0d0d0d;border:1px solid #ffffff12;border-radius:25px;padding:28px 24px;box-shadow:0 30px 100px #000}.up-icon{width:48px;height:48px;border-radius:15px;background:#fff;color:#000;display:grid;place-items:center;margin-bottom:18px}.up-card h1{margin:0;font-size:27px}.up-card p{color:#777;font-size:13px;margin:9px 0 22px}.up-field{height:52px;width:100%;border:1px solid #292929;background:#141414;border-radius:13px;color:#fff;padding:0 14px;outline:none;margin-bottom:10px}.up-submit{width:100%;height:53px;border:0;border-radius:13px;background:#fff;color:#000;font-weight:800;margin-top:5px}.up-msg{margin-top:15px;padding:12px;border-radius:11px;background:#122419;color:#8ee5aa;font-size:12px}.up-err{background:#291315;color:#ff9a9f}`}</style><section className="up-card"><div className="up-icon"><LockKeyhole size={22}/></div><h1>设置新密码</h1><p>{ready ? "设置一个新的登录密码，完成后会自动返回。" : "正在验证你的重置链接…"}</p>{ready && !done && <form onSubmit={submit}><input className="up-field" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="新密码，至少 6 位" autoComplete="new-password"/><input className="up-field" type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="再次输入新密码" autoComplete="new-password"/><button className="up-submit" disabled={loading}>{loading ? "正在保存…" : "保存新密码"}</button></form>}{done && <div className="up-msg"><CheckCircle2 size={15}/> 密码已更新，正在返回星流。</div>}{error && <div className="up-msg up-err">{error}</div>}</section></main>;
}

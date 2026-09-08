"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, Eye, EyeOff, KeyRound, Mail, ShieldCheck, Sparkles } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabase";

function safeReturnTo(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

function friendlyError(message: string) {
  if (/invalid login credentials/i.test(message)) return "账号或密码不正确";
  if (/email not confirmed/i.test(message)) return "邮箱还没有完成验证，请先完成验证后再登录";
  if (/user already registered/i.test(message)) return "这个邮箱已经注册过了，直接登录即可";
  if (/password should be at least/i.test(message)) return "密码至少需要 6 位";
  if (/rate limit|too many requests/i.test(message)) return "操作太频繁，请稍后再试";
  if (/email.*disabled|provider.*disabled/i.test(message)) return "邮箱登录暂未开启，请检查 Supabase Auth 配置";
  return message || "操作失败，请稍后再试";
}

export default function AuthPage() {
  const router = useRouter();
  const params = useSearchParams();
  const returnTo = useMemo(() => safeReturnTo(params.get("returnTo")), [params]);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [method, setMethod] = useState<"password" | "otp">("password");
  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (alive && data.session) router.replace(returnTo);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (alive && session && (event === "SIGNED_IN" || event === "PASSWORD_RECOVERY")) {
        router.replace(returnTo);
      }
    });
    return () => { alive = false; listener.subscription.unsubscribe(); };
  }, [router, returnTo]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => setCooldown(v => Math.max(0, v - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  function resetMessage() { setError(""); setSuccess(""); }
  function switchMode(next: "login" | "register") { setMode(next); setMethod("password"); resetMessage(); setPassword(""); setConfirmPassword(""); setOtp(""); }
  function switchMethod(next: "password" | "otp") { setMethod(next); resetMessage(); setOtp(""); }

  async function sendOtp() {
    if (!supabase || loading || cooldown > 0) return;
    resetMessage();
    const cleanEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) { setError("请输入正确的邮箱地址"); return; }
    setLoading(true);
    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({ email: cleanEmail, options: { shouldCreateUser: mode === "register" } });
      if (otpError) throw otpError;
      setCooldown(60);
      setSuccess("验证码已发送到邮箱，请检查收件箱和垃圾邮件");
    } catch (err) { setError(friendlyError(err instanceof Error ? err.message : "验证码发送失败")); }
    finally { setLoading(false); }
  }

  async function verifyOtp() {
    if (!supabase || loading) return;
    resetMessage();
    const cleanEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) { setError("请输入正确的邮箱地址"); return; }
    if (!/^\d{6}$/.test(otp.trim())) { setError("请输入 6 位验证码"); return; }
    setLoading(true);
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({ email: cleanEmail, token: otp.trim(), type: "email" });
      if (verifyError) throw verifyError;
      router.replace(returnTo);
    } catch (err) { setError(friendlyError(err instanceof Error ? err.message : "验证码错误")); }
    finally { setLoading(false); }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;
    if (method === "otp") { await verifyOtp(); return; }
    resetMessage();
    if (!supabase) { setError("登录服务未配置，请检查 Vercel 环境变量"); return; }
    const cleanEmail = email.trim().toLowerCase();
    const cleanNickname = nickname.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) { setError("请输入正确的邮箱地址"); return; }
    if (password.length < 6) { setError("密码至少需要 6 位"); return; }
    if (mode === "register") {
      if (cleanNickname.length < 2 || cleanNickname.length > 20) { setError("昵称需要 2–20 个字符"); return; }
      if (password !== confirmPassword) { setError("两次输入的密码不一致"); return; }
    }
    setLoading(true);
    try {
      if (mode === "register") {
        const { data, error: signUpError } = await supabase.auth.signUp({ email: cleanEmail, password, options: { data: { nickname: cleanNickname } } });
        if (signUpError) throw signUpError;
        if (data.user) {
          const { error: profileError } = await supabase.from("profiles").upsert({ id: data.user.id, nickname: cleanNickname, display_name: cleanNickname });
          if (profileError) throw profileError;
        }
        if (data.session) { router.replace(returnTo); return; }
        setMode("login"); setPassword(""); setConfirmPassword(""); setSuccess("账号创建成功，请验证邮箱后登录");
        return;
      }
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
      if (signInError) throw signInError;
      router.replace(returnTo);
    } catch (err) { setError(friendlyError(err instanceof Error ? err.message : "登录失败")); }
    finally { setLoading(false); }
  }

  return (
    <main className="auth-page-v2">
      <style jsx global>{`
        .auth-page-v2{min-height:100dvh;overflow:auto;background:#050505;color:#fff;display:flex;align-items:center;justify-content:center;padding:24px 18px;position:relative;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif}.auth-page-v2:before{content:"";position:absolute;inset:0;background:radial-gradient(circle at 50% 12%,#292929 0,transparent 38%),radial-gradient(circle at 12% 90%,#151515 0,transparent 30%);pointer-events:none}.auth-card-v2{position:relative;width:min(430px,100%);padding:28px 24px 22px;border:1px solid #ffffff12;border-radius:26px;background:#0d0d0de8;box-shadow:0 30px 100px #000;backdrop-filter:blur(24px)}.auth-brand-v2{display:flex;align-items:center;gap:11px;margin-bottom:24px}.auth-mark-v2{width:42px;height:42px;border-radius:13px;background:#fff;color:#000;display:grid;place-items:center}.auth-brand-v2 strong{font-size:21px}.auth-brand-v2 span{display:block;color:#666;font-size:11px;margin-top:2px}.auth-switch-v2{display:grid;grid-template-columns:1fr 1fr;background:#171717;border-radius:12px;padding:4px;margin-bottom:17px}.auth-switch-v2 button{height:40px;border-radius:9px;color:#777;font-weight:700}.auth-switch-v2 button.active{background:#fff;color:#000}.auth-method-v2{display:flex;gap:7px;margin-bottom:22px}.auth-method-v2 button{height:34px;padding:0 13px;border:1px solid #262626;border-radius:9px;background:#111;color:#777;font-size:12px;font-weight:700}.auth-method-v2 button.active{color:#fff;background:#202020;border-color:#444}.auth-title-v2 h1{font-size:27px;letter-spacing:-.8px;margin:0}.auth-title-v2 p{color:#777;font-size:13px;margin:8px 0 21px}.auth-field-v2{margin-bottom:14px}.auth-field-v2 label{display:block;font-size:12px;color:#aaa;margin:0 0 7px 2px;font-weight:700}.auth-input-v2{height:52px;width:100%;border:1px solid #252525;background:#141414;border-radius:13px;color:#fff;outline:none;padding:0 14px;transition:.15s}.auth-input-v2:focus{border-color:#777;box-shadow:0 0 0 3px #ffffff0a}.auth-input-v2::placeholder{color:#555}.auth-password-v2{position:relative}.auth-password-v2 input{padding-right:48px}.auth-eye-v2{position:absolute;right:5px;top:5px;width:42px;height:42px;display:grid;place-items:center;color:#777}.auth-code-row{display:grid;grid-template-columns:1fr 112px;gap:8px}.auth-code-row button{border:1px solid #333;border-radius:13px;background:#191919;color:#fff;font-size:12px;font-weight:800}.auth-code-row button:disabled{opacity:.4}.auth-message-v2{border-radius:11px;padding:11px 12px;font-size:12px;line-height:1.5;margin:3px 0 13px}.auth-error-v2{background:#291315;color:#ff9a9f;border:1px solid #632a30}.auth-success-v2{background:#122419;color:#8ee5aa;border:1px solid #234f31}.auth-submit-v2{height:53px;width:100%;border-radius:13px;background:#fff;color:#000;font-weight:850;font-size:15px;display:flex;align-items:center;justify-content:center;gap:8px}.auth-submit-v2:disabled{opacity:.45}.auth-forgot-v2{width:100%;text-align:right;color:#777;font-size:12px;margin:-3px 0 15px}.auth-trust-v2{display:flex;align-items:center;justify-content:center;gap:6px;color:#555;font-size:11px;margin:17px 0 0}.auth-tip-v2{text-align:center;color:#444;font-size:10px;line-height:1.6;margin:15px 10px 0}@media(max-width:480px){.auth-page-v2{align-items:flex-start;padding:20px 14px}.auth-card-v2{margin-top:5vh;padding:24px 18px 20px;border-radius:22px}}
      `}</style>
      <section className="auth-card-v2" aria-label="星流账号">
        <div className="auth-brand-v2"><div className="auth-mark-v2"><Sparkles size={20}/></div><div><strong>星流</strong><span>发现值得被看见的瞬间</span></div></div>
        <div className="auth-switch-v2"><button type="button" className={mode === "login" ? "active" : ""} onClick={()=>switchMode("login")}>登录</button><button type="button" className={mode === "register" ? "active" : ""} onClick={()=>switchMode("register")}>注册</button></div>
        {mode === "login" && <div className="auth-method-v2"><button type="button" className={method === "password" ? "active" : ""} onClick={()=>switchMethod("password")}><KeyRound size={13}/> 密码登录</button><button type="button" className={method === "otp" ? "active" : ""} onClick={()=>switchMethod("otp")}><Mail size={13}/> 邮箱验证码</button></div>}
        <div className="auth-title-v2"><h1>{mode === "login" ? (method === "otp" ? "验证码登录" : "欢迎回来") : "创建你的星流账号"}</h1><p>{mode === "login" ? "关注创作者、刷视频、聊天，全部同步" : "用邮箱创建一个真正属于你的账号"}</p></div>
        <form onSubmit={handleSubmit}>
          {mode === "register" && <div className="auth-field-v2"><label>昵称</label><input className="auth-input-v2" value={nickname} onChange={e=>setNickname(e.target.value)} placeholder="例如：庆乐" maxLength={20} autoComplete="nickname"/></div>}
          <div className="auth-field-v2"><label>邮箱</label><input className="auth-input-v2" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" autoCapitalize="none"/></div>
          {method === "otp" && mode === "login" ? <div className="auth-field-v2"><label>验证码</label><div className="auth-code-row"><input className="auth-input-v2" inputMode="numeric" maxLength={6} value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g, ""))} placeholder="6 位验证码" autoComplete="one-time-code"/><button type="button" disabled={loading || cooldown > 0} onClick={sendOtp}>{cooldown > 0 ? `${cooldown}s 后重发` : "发送验证码"}</button></div></div> : <>
            <div className="auth-field-v2"><label>密码</label><div className="auth-password-v2"><input className="auth-input-v2" type={showPassword?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)} placeholder="至少 6 位" autoComplete={mode === "login" ? "current-password" : "new-password"}/><button className="auth-eye-v2" type="button" onClick={()=>setShowPassword(v=>!v)}>{showPassword?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></div>
            {mode === "register" && <div className="auth-field-v2"><label>确认密码</label><div className="auth-password-v2"><input className="auth-input-v2" type={showConfirm?"text":"password"} value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} placeholder="再次输入密码" autoComplete="new-password"/><button className="auth-eye-v2" type="button" onClick={()=>setShowConfirm(v=>!v)}>{showConfirm?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></div>}
          </>}
          {mode === "login" && method === "password" && <button type="button" className="auth-forgot-v2" onClick={()=>router.push(`/auth/reset?returnTo=${encodeURIComponent(returnTo)}`)}>忘记密码？</button>}
          {error && <div className="auth-message-v2 auth-error-v2" role="alert">{error}</div>}{success && <div className="auth-message-v2 auth-success-v2" role="status"><CheckCircle2 size={14}/> {success}</div>}
          <button className="auth-submit-v2" type="submit" disabled={loading}>{loading ? "正在处理…" : method === "otp" && mode === "login" ? <>验证并登录 <ArrowRight size={17}/></> : mode === "login" ? <>登录星流 <ArrowRight size={17}/></> : <>创建账号 <ArrowRight size={17}/>}</button>
        </form>
        <div className="auth-trust-v2"><ShieldCheck size={14}/> 登录状态安全保存在你的设备</div><p className="auth-tip-v2">星流账号用于同步作品、点赞、评论、关注、通知和私信。</p>
      </section>
    </main>
  );
}

"use client";

import { FormEvent, useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, Eye, EyeOff, HelpCircle, KeyRound, LockKeyhole, Mail, MoreHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
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
  const [returnTo, setReturnTo] = useState("/");
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
    const query = new URLSearchParams(window.location.search);
    const next = safeReturnTo(query.get("returnTo"));
    setReturnTo(next);
    if (!supabase) return;
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (alive && data.session) router.replace(next);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (alive && session && (event === "SIGNED_IN" || event === "PASSWORD_RECOVERY")) {
        router.replace(safeReturnTo(new URLSearchParams(window.location.search).get("returnTo")));
      }
    });
    return () => { alive = false; listener.subscription.unsubscribe(); };
  }, [router]);

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
      const { error: otpError } = await supabase.auth.signInWithOtp({ email: cleanEmail, options: { shouldCreateUser: false } });
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

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    if (method === "otp" && mode === "login") { await verifyOtp(); return; }
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
    <main className="login-page">
      <style jsx global>{`
        *{box-sizing:border-box}
        html,body{margin:0;padding:0;background:#fff;color:#171923;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","PingFang SC","Microsoft YaHei",sans-serif}
        button,input{font:inherit}
        button{cursor:pointer}
        .login-page{min-height:100dvh;background:#fff;overflow:auto;position:relative}
        .login-wrap{width:min(100%,760px);min-height:100dvh;margin:0 auto;padding:0 52px;position:relative}
        .login-top{height:112px;display:flex;align-items:center;justify-content:space-between}
        .back{width:48px;height:48px;border:0;background:transparent;color:#20222b;display:grid;place-items:center;border-radius:50%}
        .help{border:0;background:transparent;color:#22242d;font-size:19px;font-weight:500;padding:10px 2px}
        .login-content{padding-top:67px}
        .login-title{font-size:40px;line-height:1.15;letter-spacing:-1.5px;font-weight:750;margin:0 0 55px;color:#171923}
        .field{height:78px;background:#f7f7f8;border-radius:22px;display:flex;align-items:center;padding:0 30px;margin-bottom:20px;border:1px solid transparent;transition:.15s}
        .field:focus-within{background:#f4f4f6;border-color:#e4e4e8}
        .field-icon{width:38px;display:grid;place-items:center;color:#151722;flex:none}
        .field input{width:100%;border:0;outline:0;background:transparent;font-size:23px;color:#242631;margin-left:17px;min-width:0}
        .field input::placeholder{color:#b7b8be}
        .country{display:flex;align-items:center;gap:7px;font-size:21px;white-space:nowrap}
        .divider{height:26px;width:1px;background:#c8c9ce;margin-left:8px}
        .method-row{height:35px;margin:0 0 31px;display:flex;align-items:center;gap:7px}
        .method-row button{border:0;background:transparent;color:#075da9;font-size:20px;padding:0;font-weight:500}
        .method-row .arrow{font-size:23px;transform:rotate(0deg);margin-right:2px}
        .submit{height:78px;width:100%;border:0;border-radius:22px;background:#ffafbf;color:#fff;font-size:25px;font-weight:700;letter-spacing:.5px;margin-top:3px}
        .submit:disabled{opacity:.72}
        .agreement{display:flex;justify-content:center;align-items:center;gap:8px;margin-top:32px;color:#8f9097;font-size:17px;flex-wrap:wrap}
        .check{width:25px;height:25px;border:3px solid #b5b6bb;border-radius:50%;background:#fff;appearance:none;padding:0}
        .check:checked{border-color:#0a62aa;box-shadow:inset 0 0 0 5px #fff;background:#0a62aa}
        .agreement label{display:flex;align-items:center;gap:8px;cursor:pointer}
        .agreement a{color:#075da9;text-decoration:none}
        .bottom-actions{position:absolute;left:52px;right:52px;bottom:54px;display:flex;justify-content:center;align-items:center;gap:28px}
        .social{width:96px;height:76px;border:1px solid #e3e3e7;border-radius:38px;background:#fff;display:grid;place-items:center;color:#050505}
        .apple{font-size:36px;line-height:1}
        .more{font-size:31px;letter-spacing:3px;color:#777}
        .recover{height:76px;padding:0 34px;border:1px solid #e2e2e6;background:#fff;border-radius:38px;color:#7c7e86;font-size:22px}
        .register-link{position:absolute;right:52px;top:113px;border:0;background:none;color:#075da9;font-size:16px}
        .switcher{display:flex;gap:10px;margin-top:-39px;margin-bottom:26px}
        .switcher button{border:0;background:none;color:#8b8c93;font-size:16px;padding:0}
        .switcher .on{color:#075da9;font-weight:650}
        .message{border-radius:14px;padding:13px 15px;font-size:14px;line-height:1.5;margin:15px 0;color:#9b2631;background:#fff1f2;border:1px solid #ffd2d7}
        .success{color:#287346;background:#effaf2;border-color:#ccebd5;display:flex;gap:7px;align-items:center}
        .otp-row{display:grid;grid-template-columns:1fr 150px;gap:12px}
        .otp-row .field{margin:0}
        .otp-send{height:78px;border:1px solid #e1e1e5;background:#fff;border-radius:22px;color:#075da9;font-size:17px;font-weight:650}
        .otp-send:disabled{color:#aaa}
        @media(max-width:600px){
          .login-wrap{padding:0 26px}
          .login-top{height:92px}
          .login-content{padding-top:43px}
          .login-title{font-size:31px;margin-bottom:42px}
          .field{height:66px;border-radius:18px;padding:0 20px;margin-bottom:16px}
          .field input{font-size:18px;margin-left:12px}
          .country{font-size:18px}
          .method-row{margin-bottom:25px}
          .method-row button{font-size:17px}
          .submit{height:66px;border-radius:18px;font-size:22px}
          .agreement{font-size:14px;margin-top:25px}
          .bottom-actions{left:26px;right:26px;bottom:34px;gap:13px}
          .social{width:76px;height:62px;border-radius:31px}
          .recover{height:62px;padding:0 24px;font-size:17px}
          .apple{font-size:29px}.more{font-size:25px}
          .help{font-size:17px}
          .back{width:42px;height:42px}
          .register-link{right:26px;top:94px;font-size:14px}
          .otp-row{grid-template-columns:1fr 112px;gap:8px}.otp-send{height:66px;border-radius:18px;font-size:14px}
        }
        @media(max-height:760px){.login-content{padding-top:24px}.login-title{margin-bottom:30px}.bottom-actions{bottom:20px}}
      `}</style>

      <div className="login-wrap">
        <header className="login-top">
          <button className="back" type="button" aria-label="返回" onClick={() => router.back()}><ArrowLeft size={34}/></button>
          <button className="help" type="button"><HelpCircle size={18} style={{verticalAlign:"-3px",marginRight:5}}/>帮助</button>
        </header>

        <button className="register-link" type="button" onClick={() => switchMode(mode === "login" ? "register" : "login")}>
          {mode === "login" ? "注册账号" : "返回登录"}
        </button>

        <section className="login-content">
          <h1 className="login-title">{mode === "login" ? "手机号密码登录" : "创建星流账号"}</h1>

          <div className="switcher">
            <button className={method === "password" ? "on" : ""} type="button" onClick={() => switchMethod("password")}>密码登录</button>
            <span style={{color:"#ddd"}}>·</span>
            <button className={method === "otp" ? "on" : ""} type="button" onClick={() => switchMethod("otp")}>验证码登录</button>
          </div>

          {mode === "register" && <div className="field"><div className="field-icon"><KeyRound size={23}/></div><input value={nickname} onChange={e=>setNickname(e.target.value)} placeholder="请输入昵称" maxLength={20} autoComplete="nickname"/></div>}

          <div className="field">
            <div className="country"><b>+86</b><span style={{fontSize:14}}>▼</span><span className="divider"/></div>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="请输入邮箱" autoComplete="email" autoCapitalize="none"/>
          </div>

          {method === "otp" && mode === "login" ? (
            <div className="otp-row">
              <div className="field"><div className="field-icon"><Mail size={23}/></div><input inputMode="numeric" maxLength={6} value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,""))} placeholder="请输入验证码" autoComplete="one-time-code"/></div>
              <button className="otp-send" type="button" disabled={loading||cooldown>0} onClick={sendOtp}>{cooldown>0?`${cooldown}s 后重发`:"获取验证码"}</button>
            </div>
          ) : (
            <>
              <div className="field">
                <div className="field-icon"><LockKeyhole size={23}/></div>
                <input type={showPassword?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)} placeholder="请输入密码" autoComplete={mode === "login" ? "current-password" : "new-password"}/>
                <button type="button" aria-label="显示密码" onClick={()=>setShowPassword(v=>!v)} style={{border:0,background:"transparent",color:"#8e9097",display:"grid",placeItems:"center",padding:6}}>{showPassword?<EyeOff size={22}/>:<Eye size={22}/>}</button>
              </div>
              {mode === "register" && <div className="field"><div className="field-icon"><LockKeyhole size={23}/></div><input type={showConfirm?"text":"password"} value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} placeholder="请再次输入密码" autoComplete="new-password"/><button type="button" aria-label="显示确认密码" onClick={()=>setShowConfirm(v=>!v)} style={{border:0,background:"transparent",color:"#8e9097",display:"grid",placeItems:"center",padding:6}}>{showConfirm?<EyeOff size={22}/>:<Eye size={22}/>}</button></div>}
            </>
          )}

          <div className="method-row">
            <button type="button" onClick={()=>setMethod(method === "password" ? "otp" : "password")}><span className="arrow">⇄</span> {method === "password" ? "验证码登录" : "密码登录"}</button>
          </div>

          {error && <div className="message">{error}</div>}
          {success && <div className="message success"><CheckCircle2 size={16}/>{success}</div>}

          <button className="submit" type="button" disabled={loading} onClick={(e)=>handleSubmit(e as unknown as FormEvent<HTMLFormElement>)}>{loading ? "登录中…" : "登录"}</button>

          <div className="agreement">
            <label><input className="check" type="checkbox" defaultChecked={false}/><span>已阅读并同意</span></label>
            <a href="/terms">用户协议</a><span>和</span><a href="/privacy">隐私政策</a>
          </div>
        </section>

        <div className="bottom-actions">
          <button className="social" type="button" aria-label="Apple 登录"><span className="apple">●</span></button>
          <button className="social" type="button" aria-label="更多登录方式"><MoreHorizontal className="more" size={32}/></button>
          <button className="recover" type="button" onClick={()=>router.push(`/auth/reset?returnTo=${encodeURIComponent(returnTo)}`)}>找回账号</button>
        </div>
      </div>
    </main>
  );
}

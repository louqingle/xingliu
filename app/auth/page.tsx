"use client";

import { FormEvent, useEffect, useState } from "react";
import { Apple, ArrowLeft, CheckCircle2, ChevronDown, Eye, EyeOff, HelpCircle, LockKeyhole, MoreHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

function safeReturnTo(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

function friendlyError(message: string) {
  if (/invalid login credentials/i.test(message)) return "手机号或密码不正确";
  if (/phone.*not.*enabled|phone.*disabled|provider.*disabled/i.test(message)) return "手机号登录还没有在 Supabase Auth 中开启";
  if (/sms.*provider|twilio|messagebird|vonage/i.test(message)) return "短信服务还没有配置，请先在 Supabase 配置短信服务商";
  if (/user already registered/i.test(message)) return "这个手机号已经注册过了，请直接登录";
  if (/password should be at least/i.test(message)) return "密码至少需要 6 位";
  if (/rate limit|too many requests/i.test(message)) return "操作太频繁，请稍后再试";
  if (/invalid.*phone|phone.*invalid/i.test(message)) return "请输入正确的手机号";
  return message || "操作失败，请稍后再试";
}

function normalizePhone(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  return `+86${digits}`;
}

export default function AuthPage() {
  const router = useRouter();
  const [returnTo, setReturnTo] = useState("/");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [method, setMethod] = useState<"password" | "otp">("password");
  const [phone, setPhone] = useState("");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const next = safeReturnTo(new URLSearchParams(window.location.search).get("returnTo"));
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
  function switchMode(next: "login" | "register") {
    setMode(next); setMethod("password"); resetMessage(); setPassword(""); setConfirmPassword(""); setOtp("");
  }
  function switchMethod(next: "password" | "otp") { setMethod(next); resetMessage(); setOtp(""); }

  async function sendPhoneOtp() {
    if (!supabase || loading || cooldown > 0) return;
    resetMessage();
    if (!/^1\d{10}$/.test(phone.trim())) { setError("请输入正确的 11 位手机号"); return; }
    if (!agreed) { setError("请先阅读并同意用户协议和隐私政策"); return; }
    setLoading(true);
    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({ phone: normalizePhone(phone) });
      if (otpError) throw otpError;
      setCooldown(60);
      setSuccess("验证码已发送，请查收短信");
    } catch (err) { setError(friendlyError(err instanceof Error ? err.message : "验证码发送失败")); }
    finally { setLoading(false); }
  }

  async function verifyPhoneOtp() {
    if (!supabase || loading) return;
    resetMessage();
    if (!/^1\d{10}$/.test(phone.trim())) { setError("请输入正确的 11 位手机号"); return; }
    if (!/^\d{6}$/.test(otp.trim())) { setError("请输入 6 位验证码"); return; }
    if (!agreed) { setError("请先阅读并同意用户协议和隐私政策"); return; }
    setLoading(true);
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({ phone: normalizePhone(phone), token: otp.trim(), type: "sms" });
      if (verifyError) throw verifyError;
      router.replace(returnTo);
    } catch (err) { setError(friendlyError(err instanceof Error ? err.message : "验证码错误")); }
    finally { setLoading(false); }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    if (method === "otp") { await verifyPhoneOtp(); return; }
    resetMessage();
    if (!supabase) { setError("登录服务未配置，请检查 Vercel 环境变量"); return; }
    if (!/^1\d{10}$/.test(phone.trim())) { setError("请输入正确的 11 位手机号"); return; }
    if (password.length < 6) { setError("密码至少需要 6 位"); return; }
    if (!agreed) { setError("请先阅读并同意用户协议和隐私政策"); return; }
    if (mode === "register") {
      const cleanNickname = nickname.trim();
      if (cleanNickname.length < 2 || cleanNickname.length > 20) { setError("昵称需要 2–20 个字符"); return; }
      if (password !== confirmPassword) { setError("两次输入的密码不一致"); return; }
    }
    setLoading(true);
    try {
      const fullPhone = normalizePhone(phone);
      if (mode === "register") {
        const cleanNickname = nickname.trim();
        const { data, error: signUpError } = await supabase.auth.signUp({
          phone: fullPhone,
          password,
          options: { data: { nickname: cleanNickname, display_name: cleanNickname } },
        });
        if (signUpError) throw signUpError;
        if (data.user) {
          const { error: profileError } = await supabase.from("profiles").upsert({ id: data.user.id, nickname: cleanNickname, display_name: cleanNickname });
          if (profileError) throw profileError;
        }
        if (data.session) { router.replace(returnTo); return; }
        setMode("login"); setPassword(""); setConfirmPassword("");
        setSuccess("账号创建成功。如果开启了短信验证，请先完成手机号验证");
        return;
      }
      const { error: signInError } = await supabase.auth.signInWithPassword({ phone: fullPhone, password });
      if (signInError) throw signInError;
      router.replace(returnTo);
    } catch (err) { setError(friendlyError(err instanceof Error ? err.message : "登录失败")); }
    finally { setLoading(false); }
  }

  return (
    <main className="login-page">
      <style jsx global>{`
        *{box-sizing:border-box}html,body{margin:0;padding:0;background:#fff;color:#171923;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","PingFang SC","Microsoft YaHei",sans-serif}button,input{font:inherit}button{cursor:pointer}.login-page{min-height:100dvh;background:#fff;overflow:auto}.login-wrap{width:min(100%,760px);min-height:100dvh;margin:0 auto;padding:0 52px;position:relative}.login-top{height:112px;display:flex;align-items:center;justify-content:space-between}.back{width:48px;height:48px;border:0;background:transparent;color:#20222b;display:grid;place-items:center;border-radius:50%}.help{border:0;background:transparent;color:#22242d;font-size:19px;font-weight:500;padding:10px 2px}.login-content{padding-top:55px}.login-title{font-size:40px;line-height:1.15;letter-spacing:-1.5px;font-weight:750;margin:0 0 44px;color:#171923}.switcher{display:flex;gap:14px;margin:0 0 24px}.switcher button{border:0;background:none;color:#a0a1a7;font-size:17px;padding:0}.switcher .on{color:#075da9;font-weight:700}.field{height:78px;background:#f7f7f8;border-radius:22px;display:flex;align-items:center;padding:0 30px;margin-bottom:18px;border:1px solid transparent}.field:focus-within{background:#f4f4f6;border-color:#e4e4e8}.country{display:flex;align-items:center;gap:7px;font-size:21px;white-space:nowrap}.divider{height:28px;width:1px;background:#c8c9ce;margin-left:8px}.field input{width:100%;border:0;outline:0;background:transparent;font-size:23px;color:#242631;margin-left:17px;min-width:0}.field input::placeholder{color:#b7b8be}.password{position:relative}.password input{padding-right:46px}.eye{position:absolute;right:8px;top:8px;width:48px;height:62px;border:0;background:transparent;color:#8f9097;display:grid;place-items:center}.method-row{height:78px;display:grid;grid-template-columns:1fr 150px;gap:12px;margin-bottom:16px}.method-row .field{margin:0}.otp-send{height:78px;border:1px solid #e1e1e5;background:#fff;border-radius:22px;color:#075da9;font-size:17px;font-weight:700}.otp-send:disabled{color:#aaa}.submit{height:78px;width:100%;border:0;border-radius:22px;background:#ffafbf;color:#fff;font-size:25px;font-weight:700;letter-spacing:.5px;margin-top:3px}.submit:disabled{opacity:.65}.agreement{display:flex;justify-content:center;align-items:center;gap:7px;margin-top:27px;color:#8f9097;font-size:17px;flex-wrap:wrap}.check{width:25px;height:25px;border:3px solid #b5b6bb;border-radius:50%;background:#fff;appearance:none;padding:0}.check:checked{border-color:#0a62aa;box-shadow:inset 0 0 0 5px #fff;background:#0a62aa}.agreement label{display:flex;align-items:center;gap:7px;cursor:pointer}.agreement a{color:#075da9;text-decoration:none}.message{border-radius:14px;padding:13px 15px;font-size:14px;line-height:1.5;margin:14px 0;color:#9b2631;background:#fff1f2;border:1px solid #ffd2d7}.success{color:#287346;background:#effaf2;border-color:#ccebd5;display:flex;gap:7px;align-items:center}.bottom-actions{position:absolute;left:52px;right:52px;bottom:54px;display:flex;justify-content:center;align-items:center;gap:28px}.social{width:96px;height:76px;border:1px solid #e3e3e7;border-radius:38px;background:#fff;display:grid;place-items:center;color:#050505}.more{font-size:31px;letter-spacing:3px;color:#777}.recover{height:76px;padding:0 34px;border:1px solid #e2e2e6;background:#fff;border-radius:38px;color:#7c7e86;font-size:22px}.register-link{position:absolute;right:52px;top:113px;border:0;background:none;color:#075da9;font-size:16px}.hint{color:#9b9ca3;text-align:center;font-size:13px;margin-top:12px}.hint b{color:#075da9}.@media(max-width:600px){.login-wrap{padding:0 26px}.login-top{height:92px}.login-content{padding-top:38px}.login-title{font-size:31px;margin-bottom:34px}.field{height:66px;border-radius:18px;padding:0 20px;margin-bottom:14px}.field input{font-size:18px;margin-left:12px}.country{font-size:18px}.method-row{height:66px;grid-template-columns:1fr 112px;gap:8px}.otp-send{height:66px;border-radius:18px;font-size:14px}.submit{height:66px;border-radius:18px;font-size:22px}.agreement{font-size:14px;margin-top:22px}.bottom-actions{left:26px;right:26px;bottom:34px;gap:13px}.social{width:76px;height:62px;border-radius:31px}.recover{height:62px;padding:0 24px;font-size:17px}.more{font-size:25px}.help{font-size:17px}.back{width:42px;height:42px}.register-link{right:26px;top:94px;font-size:14px}}@media(max-height:760px){.login-content{padding-top:18px}.login-title{margin-bottom:25px}.bottom-actions{bottom:18px}}
      `}</style>

      <div className="login-wrap">
        <header className="login-top"><button className="back" type="button" aria-label="返回" onClick={() => router.back()}><ArrowLeft size={34}/></button><button className="help" type="button"><HelpCircle size={18} style={{verticalAlign:"-3px",marginRight:5}}/>帮助</button></header>
        <button className="register-link" type="button" onClick={() => switchMode(mode === "login" ? "register" : "login")}>{mode === "login" ? "注册账号" : "返回登录"}</button>

        <section className="login-content">
          <h1 className="login-title">{mode === "login" ? "手机号密码登录" : "创建星流账号"}</h1>
          <div className="switcher"><button className={method === "password" ? "on" : ""} type="button" onClick={() => switchMethod("password")}>密码登录</button><span style={{color:"#ddd"}}>·</span><button className={method === "otp" ? "on" : ""} type="button" onClick={() => switchMethod("otp")}>验证码登录</button></div>

          {mode === "register" && <div className="field"><LockKeyhole size={22}/><input value={nickname} onChange={e=>setNickname(e.target.value)} placeholder="请输入昵称" maxLength={20} autoComplete="nickname"/></div>}

          {method === "otp" ? <div className="method-row"><div className="field"><div className="country"><b>+86</b><ChevronDown size={16}/><span className="divider"/></div><input inputMode="numeric" maxLength={11} value={phone} onChange={e=>setPhone(e.target.value.replace(/\D/g,""))} placeholder="请输入手机号" autoComplete="tel"/></div><button className="otp-send" type="button" disabled={loading||cooldown>0} onClick={sendPhoneOtp}>{cooldown>0?`${cooldown}s 重发`:"获取验证码"}</button></div> : <>
            <div className="field"><div className="country"><b>+86</b><ChevronDown size={16}/><span className="divider"/></div><input inputMode="numeric" maxLength={11} value={phone} onChange={e=>setPhone(e.target.value.replace(/\D/g,""))} placeholder="请输入手机号" autoComplete="tel"/></div>
            <div className="field password"><LockKeyhole size={22}/><input type={showPassword?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)} placeholder="请输入密码" autoComplete={mode==="login"?"current-password":"new-password"}/><button className="eye" type="button" onClick={()=>setShowPassword(v=>!v)}>{showPassword?<EyeOff size={20}/>:<Eye size={20}/>}</button></div>
            {mode === "register" && <div className="field password"><LockKeyhole size={22}/><input type={showConfirm?"text":"password"} value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} placeholder="请再次输入密码" autoComplete="new-password"/><button className="eye" type="button" onClick={()=>setShowConfirm(v=>!v)}>{showConfirm?<EyeOff size={20}/>:<Eye size={20}/>}</button></div>}
          </>}

          {method === "otp" && <div className="field"><LockKeyhole size={22}/><input inputMode="numeric" maxLength={6} value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,""))} placeholder="请输入 6 位验证码" autoComplete="one-time-code"/></div>}
          {error && <div className="message">{error}</div>}
          {success && <div className="message success"><CheckCircle2 size={15}/>{success}</div>}
          <button className="submit" type="button" disabled={loading||!agreed} onClick={(e)=>{void handleSubmit(e as unknown as FormEvent<HTMLFormElement>)}}>{loading?"处理中…":method==="otp"?"验证并登录":mode==="login"?"登录":"注册并登录"}</button>

          <div className="agreement"><label><input className="check" type="checkbox" checked={agreed} onChange={e=>setAgreed(e.target.checked)}/>已阅读并同意</label><a href="#">用户协议</a><span>和</span><a href="#">隐私政策</a></div>
          <div className="hint">手机号仅用于账号登录与安全验证 · <b>+86 中国大陆</b></div>
        </section>

        <div className="bottom-actions"><button className="social" type="button" aria-label="Apple 登录"><Apple size={34} fill="currentColor"/></button><button className="social" type="button" aria-label="更多登录方式"><MoreHorizontal size={34}/></button><button className="recover" type="button" onClick={()=>setSuccess("手机号密码找回功能下一步接入")}>找回账号</button></div>
      </div>
    </main>
  );
}

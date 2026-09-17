"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, Eye, EyeOff, HelpCircle, Mail, Phone } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

function safeReturnTo(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

function normalizePhone(raw: string) {
  const digits = raw.replace(/\D/g, "");
  return digits ? `+86${digits}` : "";
}

function friendlyError(message: string) {
  if (/invalid login credentials/i.test(message)) return "账号或密码不正确";
  if (/email.*not.*confirmed/i.test(message)) return "邮箱还没有完成验证，请先去邮箱确认";
  if (/phone.*not.*enabled|phone.*disabled|provider.*disabled/i.test(message)) return "手机号登录还没有在 Supabase Auth 中开启";
  if (/sms.*provider|twilio|messagebird|vonage/i.test(message)) return "短信服务还没有配置，请先在 Supabase 配置短信服务商";
  if (/user already registered/i.test(message)) return "这个账号已经注册过了，请直接登录";
  if (/password should be at least/i.test(message)) return "密码至少需要 6 位";
  if (/rate limit|too many requests/i.test(message)) return "操作太频繁，请稍后再试";
  if (/invalid.*email/i.test(message)) return "请输入正确的邮箱地址";
  if (/invalid.*phone|phone.*invalid/i.test(message)) return "请输入正确的手机号";
  return message || "操作失败，请稍后再试";
}

export default function AuthPage() {
  const router = useRouter();
  const [returnTo, setReturnTo] = useState("/");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [method, setMethod] = useState<"phone" | "email">("phone");
  const [loginType, setLoginType] = useState<"password" | "otp">("password");
  const [identifier, setIdentifier] = useState("");
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
      if (alive && session && (event === "SIGNED_IN" || event === "PASSWORD_RECOVERY")) router.replace(next);
    });
    return () => { alive = false; listener.subscription.unsubscribe(); };
  }, [router]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => setCooldown(v => Math.max(0, v - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  function resetMessage() { setError(""); setSuccess(""); }

  function changeMethod(next: "phone" | "email") {
    setMethod(next); setLoginType("password"); setIdentifier(""); setOtp(""); resetMessage();
  }

  function changeMode(next: "login" | "register") {
    setMode(next); setLoginType("password"); setPassword(""); setConfirmPassword(""); setOtp(""); resetMessage();
  }

  async function sendPhoneOtp() {
    if (!supabase || loading || cooldown > 0) return;
    resetMessage();
    if (!/^1\d{10}$/.test(identifier.trim())) { setError("请输入正确的 11 位手机号"); return; }
    if (!agreed) { setError("请先阅读并同意用户协议和隐私政策"); return; }
    setLoading(true);
    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({ phone: normalizePhone(identifier) });
      if (otpError) throw otpError;
      setCooldown(60);
      setSuccess("验证码已发送，请查收短信");
    } catch (err) { setError(friendlyError(err instanceof Error ? err.message : "验证码发送失败")); }
    finally { setLoading(false); }
  }

  async function verifyPhoneOtp() {
    if (!supabase || loading) return;
    resetMessage();
    if (!/^1\d{10}$/.test(identifier.trim())) { setError("请输入正确的 11 位手机号"); return; }
    if (!/^\d{6}$/.test(otp.trim())) { setError("请输入 6 位验证码"); return; }
    if (!agreed) { setError("请先阅读并同意用户协议和隐私政策"); return; }
    setLoading(true);
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({ phone: normalizePhone(identifier), token: otp.trim(), type: "sms" });
      if (verifyError) throw verifyError;
      router.replace(returnTo);
    } catch (err) { setError(friendlyError(err instanceof Error ? err.message : "验证码错误")); }
    finally { setLoading(false); }
  }

  async function handleSubmit() {
    if (loading) return;
    resetMessage();
    if (!supabase) { setError("登录服务未配置，请检查 Vercel 环境变量"); return; }
    if (method === "phone" && loginType === "otp") { await verifyPhoneOtp(); return; }
    if (method === "phone") {
      if (!/^1\d{10}$/.test(identifier.trim())) { setError("请输入正确的 11 位手机号"); return; }
    } else if (!/^\S+@\S+\.\S+$/.test(identifier.trim())) {
      setError("请输入正确的邮箱地址"); return;
    }
    if (password.length < 6) { setError("密码至少需要 6 位"); return; }
    if (!agreed) { setError("请先阅读并同意用户协议和隐私政策"); return; }
    if (mode === "register") {
      const cleanNickname = nickname.trim();
      if (cleanNickname.length < 2 || cleanNickname.length > 20) { setError("昵称需要 2–20 个字符"); return; }
      if (password !== confirmPassword) { setError("两次输入的密码不一致"); return; }
    }
    setLoading(true);
    try {
      if (mode === "register") {
        const cleanNickname = nickname.trim();
        const credentials = method === "phone"
          ? { phone: normalizePhone(identifier), password }
          : { email: identifier.trim(), password };
        const { data, error: signUpError } = await supabase.auth.signUp({
          ...credentials,
          options: { data: { nickname: cleanNickname, display_name: cleanNickname } },
        });
        if (signUpError) throw signUpError;
        if (data.user) {
          const { error: profileError } = await supabase.from("profiles").upsert({ id: data.user.id, nickname: cleanNickname, display_name: cleanNickname });
          if (profileError) throw profileError;
        }
        if (data.session) { router.replace(returnTo); return; }
        setMode("login"); setPassword(""); setConfirmPassword("");
        setSuccess(method === "email" ? "注册成功，请去邮箱完成验证后再登录" : "注册成功，请直接登录");
        return;
      }

      const { error: signInError } = method === "phone"
        ? await supabase.auth.signInWithPassword({ phone: normalizePhone(identifier), password })
        : await supabase.auth.signInWithPassword({ email: identifier.trim(), password });
      if (signInError) throw signInError;
      router.replace(returnTo);
    } catch (err) { setError(friendlyError(err instanceof Error ? err.message : "登录失败")); }
    finally { setLoading(false); }
  }

  return (
    <main className="login-page">
      <style jsx global>{`
        *{box-sizing:border-box}html,body{margin:0;padding:0;background:#fff;color:#171923;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","PingFang SC","Microsoft YaHei",sans-serif}button,input{font:inherit}button{cursor:pointer}.login-page{min-height:100dvh;background:#fff}.login-wrap{width:min(100%,760px);min-height:100dvh;margin:0 auto;padding:0 52px;position:relative}.login-top{height:112px;display:flex;align-items:center;justify-content:space-between}.back,.help{border:0;background:transparent;color:#20222b}.back{width:48px;height:48px;display:grid;place-items:center;border-radius:50%}.help{font-size:18px;padding:10px}.login-content{padding-top:55px}.login-title{font-size:40px;line-height:1.15;letter-spacing:-1.5px;font-weight:750;margin:0 0 34px}.switcher{display:flex;gap:22px;margin-bottom:22px;border-bottom:1px solid #eee;padding-bottom:14px}.switcher button{border:0;background:none;color:#aaa;font-size:17px;padding:0 0 9px}.switcher .on{color:#075da9;font-weight:700;border-bottom:2px solid #075da9}.field{height:76px;background:#f7f7f8;border-radius:21px;display:flex;align-items:center;padding:0 25px;margin-bottom:15px;border:1px solid transparent}.field:focus-within{border-color:#e3e3e8;background:#f4f4f6}.field input{width:100%;border:0;outline:0;background:transparent;font-size:21px;color:#242631;margin-left:14px;min-width:0}.field input::placeholder{color:#b5b6bc}.method-row{display:grid;grid-template-columns:1fr 145px;gap:10px}.otp-send{height:76px;border:1px solid #e0e0e5;background:#fff;border-radius:21px;color:#075da9;font-weight:700}.otp-send:disabled{color:#aaa}.password{position:relative}.password input{padding-right:44px}.eye{position:absolute;right:7px;top:7px;width:50px;height:62px;border:0;background:none;color:#92939a;display:grid;place-items:center}.submit{height:76px;width:100%;border:0;border-radius:21px;background:#ffafbf;color:#fff;font-size:24px;font-weight:700;margin-top:3px}.submit:disabled{opacity:.65}.agreement{display:flex;justify-content:center;align-items:center;gap:7px;margin-top:24px;color:#909198;font-size:15px;flex-wrap:wrap}.check{width:23px;height:23px;appearance:none;border:2px solid #b5b6bb;border-radius:50%;padding:0;background:#fff}.check:checked{border-color:#075da9;box-shadow:inset 0 0 0 4px #fff;background:#075da9}.agreement a{color:#075da9;text-decoration:none}.message{border-radius:14px;padding:12px 14px;font-size:14px;line-height:1.5;margin:14px 0;color:#9b2631;background:#fff1f2;border:1px solid #ffd2d7}.success{color:#287346;background:#effaf2;border-color:#ccebd5;display:flex;gap:7px;align-items:center}.bottom-actions{position:absolute;left:52px;right:52px;bottom:46px;display:flex;justify-content:center;align-items:center;gap:14px}.social,.recover{height:64px;border:1px solid #e2e2e6;background:#fff;border-radius:32px;color:#555}.social{width:64px;display:grid;place-items:center}.recover{padding:0 24px;font-size:17px}.register-link{position:absolute;right:52px;top:112px;border:0;background:none;color:#075da9;font-size:16px}@media(max-width:600px){.login-wrap{padding:0 25px}.login-top{height:88px}.login-content{padding-top:32px}.login-title{font-size:31px;margin-bottom:29px}.field{height:65px;border-radius:18px;padding:0 19px}.field input{font-size:18px}.method-row{grid-template-columns:1fr 110px}.otp-send{height:65px;border-radius:18px;font-size:13px}.submit{height:65px;border-radius:18px;font-size:21px}.agreement{font-size:13px}.bottom-actions{left:25px;right:25px;bottom:25px}.recover{font-size:16px}.register-link{right:25px;top:90px;font-size:14px}}
      `}</style>

      <div className="login-wrap">
        <header className="login-top"><button className="back" type="button" aria-label="返回" onClick={() => router.back()}><ArrowLeft size={31}/></button><button className="help" type="button"><HelpCircle size={18} style={{verticalAlign:"-3px",marginRight:5}}/>帮助</button></header>
        <button className="register-link" type="button" onClick={() => changeMode(mode === "login" ? "register" : "login")}>{mode === "login" ? "注册账号" : "返回登录"}</button>
        <section className="login-content">
          <h1 className="login-title">{mode === "login" ? "登录星流" : "创建星流账号"}</h1>
          <div className="switcher">
            <button className={method === "phone" ? "on" : ""} type="button" onClick={() => changeMethod("phone")}><Phone size={16} style={{verticalAlign:"-3px",marginRight:5}}/>手机号</button>
            <button className={method === "email" ? "on" : ""} type="button" onClick={() => changeMethod("email")}><Mail size={16} style={{verticalAlign:"-3px",marginRight:5}}/>邮箱</button>
          </div>

          {mode === "register" && <div className="field"><input value={nickname} onChange={e=>setNickname(e.target.value)} placeholder="请输入昵称" maxLength={20} autoComplete="nickname"/></div>}

          {method === "phone" && loginType === "otp" ? <div className="method-row"><div className="field"><input inputMode="numeric" maxLength={11} value={identifier} onChange={e=>setIdentifier(e.target.value.replace(/\D/g,""))} placeholder="请输入手机号" autoComplete="tel"/></div><button className="otp-send" type="button" disabled={loading||cooldown>0} onClick={sendPhoneOtp}>{cooldown>0?`${cooldown}s 重发`:"获取验证码"}</button></div> : <div className="field"><input value={identifier} onChange={e=>setIdentifier(e.target.value)} placeholder={method === "phone" ? "请输入手机号" : "请输入邮箱地址"} inputMode={method === "phone" ? "numeric" : "email"} autoComplete={method === "phone" ? "tel" : "email"}/></div>}

          {method === "phone" && loginType === "otp" ? <div className="field"><input inputMode="numeric" maxLength={6} value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,""))} placeholder="请输入 6 位验证码" autoComplete="one-time-code"/></div> : <>
            <div className="field password"><input type={showPassword ? "text" : "password"} value={password} onChange={e=>setPassword(e.target.value)} placeholder="请输入密码" autoComplete={mode === "register" ? "new-password" : "current-password"}/><button className="eye" type="button" aria-label="显示密码" onClick={()=>setShowPassword(v=>!v)}>{showPassword?<EyeOff size={22}/>:<Eye size={22}/>}</button></div>
            {mode === "register" && <div className="field password"><input type={showConfirm ? "text" : "password"} value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} placeholder="请再次输入密码" autoComplete="new-password"/><button className="eye" type="button" aria-label="显示确认密码" onClick={()=>setShowConfirm(v=>!v)}>{showConfirm?<EyeOff size={22}/>:<Eye size={22}/>}</button></div>}
          </>}

          {method === "phone" && mode === "login" && <button type="button" className="switch-otp" onClick={()=>{setLoginType(loginType === "password" ? "otp" : "password");resetMessage()}}>{loginType === "password" ? "验证码登录" : "密码登录"}</button>}
          {error && <div className="message">{error}</div>}
          {success && <div className="message success"><CheckCircle2 size={17}/>{success}</div>}
          <button className="submit" type="button" disabled={loading} onClick={()=>void handleSubmit()}>{loading ? "处理中…" : mode === "register" ? "注册" : loginType === "otp" ? "登录" : "登录"}</button>
          <div className="agreement"><label><input className="check" type="checkbox" checked={agreed} onChange={e=>setAgreed(e.target.checked)}/>我已阅读并同意</label><a href="#">用户协议</a><span>和</span><a href="#">隐私政策</a></div>
        </section>
        <div className="bottom-actions"><button className="social" type="button" aria-label="Apple"></button><button className="social" type="button" aria-label="更多">•••</button><button className="recover" type="button" onClick={()=>setSuccess(method === "email" ? "邮箱账号找回功能可以下一步接入" : "手机号找回功能可以下一步接入")}>找回账号</button></div>
      </div>
    </main>
  );
}
